import os
import uuid
from typing import Dict

from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, render_template, request
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph

from src.prompt import *

load_dotenv()

app = Flask(__name__)

# Lazy LLM initialization to avoid crash if env var isn't set at import time
llm = None
workflow = None

def get_workflow():
    global llm, workflow
    if workflow is None:
        llm = ChatOpenAI(
            model="gpt-4.1-nano",
            temperature=0.7,
            timeout=None,
            max_retries=2,
            max_completion_tokens=800,
        )
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
    return workflow

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
    data = request.json or {}
    user_message = data.get("message", "")
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
        
        # Handle goals as array or string
        if isinstance(goal, list):
            goal_text = ', '.join(goal) if goal else 'not set'
        else:
            goal_text = goal or 'not set'
        
        details = []
        if name:
            details.append(f"Name: {name}")
        if goal_text != 'not set':
            details.append(f"Goals: {goal_text}")
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
        response = get_workflow().invoke(
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
    
    # Handle goals as array or string
    if isinstance(goal, list):
        goal_text = ', '.join(goal) if goal else 'not set'
    else:
        goal_text = goal or 'not set'
    
    details = []
    if name:
        details.append(f"Name: {name}")
    if goal_text != 'not set':
        details.append(f"Goals: {goal_text}")
    if culture:
        details.append(f"Food Culture: {culture}")
    if age:
        details.append(f"Age: {age}")
    if health:
        details.append(f"Health conditions: {health}")
    if allergies:
        details.append(f"Allergies: {allergies}")
    
    details_text = "\n".join(details) if details else "No additional details provided"
    
    welcome_prompt = f"""The user just started chatting. Their details:
{details_text}

Reply with a SHORT welcome (2-3 sentences max). Use their name. Acknowledge their goals in one line. Ask ONE simple question. Be casual like a friend, not a robot."""
    
    user_sessions[session_id].append(HumanMessage(content=welcome_prompt))
    
    try:
        response = get_workflow().invoke(
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

@app.route('/health')
def health():
    key_set = bool(os.environ.get("OPENAI_API_KEY"))
    return jsonify({"status": "ok", "openai_key_set": key_set})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))


