from flask import Flask, render_template, request, jsonify, make_response
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from dotenv import load_dotenv
from langchain_community.cache import InMemoryCache
from langchain.globals import set_llm_cache
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, END, MessagesState, StateGraph
from typing import Dict
import uuid
import os
from src.prompt import *

# Set up caching and environment
set_llm_cache(InMemoryCache())
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


app = Flask(__name__)


llm = ChatOpenAI(
    model="gpt-4.1-nano",
    openai_api_key=OPENAI_API_KEY,
    temperature=1.0,
    timeout=None,
    max_retries=2,
    max_tokens=1000,
    streaming=True,
)



# Create LangGraph workflow
graph = StateGraph(state_schema=MessagesState)

def call_model(state: MessagesState) -> Dict:
    system_msg = SystemMessage(content=system_prompt)
    messages = [system_msg] + state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}

graph.add_node("model", call_model)
graph.add_edge(START, "model")
graph.add_edge("model", END)

memory = MemorySaver()
workflow = graph.compile(checkpointer=memory)

# Session manager
user_sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fit')
def fitness():
    return render_template('fit.html')


@app.route('/get_response', methods=['POST'])
def get_response():
    user_message = request.json.get("message")
    session_id = request.cookies.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())

    # Create session if it does not exists
    user_sessions.setdefault(session_id, [])  
    user_sessions[session_id].append(HumanMessage(content=user_message))

    try:
        response = workflow.invoke(
            {"messages": user_sessions[session_id]},
            config={"configurable": {"thread_id": session_id}}
        )
        bot_reply = response["messages"][-1]
        user_sessions[session_id].append(bot_reply)

        res = make_response(jsonify({'response': bot_reply.content}))
        res.set_cookie("session_id", session_id)
        return res

    except Exception as e:
        return jsonify({'response': f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))


