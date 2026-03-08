from flask import Flask, render_template, request, jsonify, make_response
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, END, MessagesState, StateGraph
from typing import Dict
import uuid
import os
from src.prompt import *

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = Flask(__name__)

llm = ChatOpenAI(
    model="gpt-4.1-nano",
    openai_api_key=OPENAI_API_KEY,
    temperature=0.7,
    timeout=None,
    max_retries=2,
    max_tokens=800,
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
    data = request.json
    user_message = data.get("message")
    context = data.get("context", {})
    
    session_id = request.cookies.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())

    user_sessions.setdefault(session_id, [])
    
    # Prepend context if available
    if context:
        goal = context.get('goal', '')
        culture = context.get('culture', 'nigerian')
        name = context.get('name', '')
        age = context.get('age', '')
        health = context.get('health', '')
        allergies = context.get('allergies', '')
        nutrition_only = context.get('nutritionOnly', False)
        home_only = context.get('homeOnly', True)
        
        details = []
        if name:
            details.append(f"Name: {name}")
        if goal:
            details.append(f"Goal: {goal}")
        if culture:
            details.append(f"Culture: {culture}")
        if age:
            details.append(f"Age: {age}")
        if health:
            details.append(f"Health: {health}")
        if allergies:
            details.append(f"Allergies: {allergies}")
        
        context_msg = "User Details: " + ", ".join(details) if details else "No additional details"
        user_sessions[session_id].append(HumanMessage(content=context_msg))
    
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


@app.route('/welcome', methods=['POST'])
def welcome():
    data = request.json or {}
    goal = data.get('goal', '')
    culture = data.get('culture', 'nigerian')
    name = data.get('name', '')
    age = data.get('age', '')
    health = data.get('health', '')
    allergies = data.get('allergies', '')
    
    session_id = request.cookies.get('session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
    
    user_sessions.setdefault(session_id, [])
    
    details = []
    if name:
        details.append(f"Name: {name}")
    if goal:
        details.append(f"Goal: {goal}")
    if culture:
        details.append(f"Food Culture: {culture}")
    if age:
        details.append(f"Age: {age}")
    if health:
        details.append(f"Health conditions: {health}")
    if allergies:
        details.append(f"Allergies: {allergies}")
    
    details_text = "\n".join(details) if details else "No additional details provided"
    
    welcome_prompt = f"""Start a conversation with the user. Here are their details:

{details_text}

Give them a warm, personalized welcome. Use their name if available. Acknowledge their goal and cultural background. If they have health conditions or allergies, mention you'll keep those in mind. Ask about their current situation and what specifically they want to achieve. Keep it conversational and encouraging. Make it sound like a real person talking, not a robot."""
    
    user_sessions[session_id].append(HumanMessage(content=welcome_prompt))
    
    try:
        response = workflow.invoke(
            {"messages": user_sessions[session_id]},
            config={"configurable": {"thread_id": session_id}}
        )
        welcome_msg = response["messages"][-1]
        user_sessions[session_id].append(welcome_msg)
        
        res = make_response(jsonify({'response': welcome_msg.content}))
        res.set_cookie("session_id", session_id)
        return res
    except Exception as e:
        return jsonify({'response': f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))


