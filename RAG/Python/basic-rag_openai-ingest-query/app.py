import streamlit as st
from query import load_index, query_knowledge_base

st.set_page_config(
    page_title="Company Knowledge Base",
    page_icon="🔍",
    layout="centered"
)

st.title("🔍 Company Knowledge Base")
st.write("Ask any question about our products, policies, or procedures.")

# Load the index once and cache it across sessions
@st.cache_resource
def get_index():
    return load_index()

try:
    index = get_index()
    st.success("Knowledge base loaded and ready.", icon="✅")
except Exception as e:
    st.error(f"Failed to load knowledge base: {e}")
    st.info("Make sure you have run `python ingest.py` first.")
    st.stop()

# Maintain chat history in session state
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])
        if message["role"] == "assistant" and message.get("sources"):
            with st.expander("Sources used"):
                for s in message["sources"]:
                    st.write(f"- {s}")

# Chat input
question = st.chat_input("Ask a question...")
if question:
    # Display user message
    with st.chat_message("user"):
        st.write(question)
    st.session_state.messages.append({"role": "user", "content": question})

    # Generate and display assistant response
    with st.chat_message("assistant"):
        with st.spinner("Searching knowledge base..."):
            result = query_knowledge_base(question, index)
        st.write(result["answer"])
        if result["sources"]:
            with st.expander("Sources used"):
                for s in result["sources"]:
                    st.write(f"- {s}")

    st.session_state.messages.append({
        "role": "assistant",
        "content": result["answer"],
        "sources": result["sources"]
    })
