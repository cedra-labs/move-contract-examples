/* =====================================================
   STATE & UI HELPERS
===================================================== */
let activeConversationId = null;

const getUI = () => ({
    input: document.getElementById("input"),
    sendBtn: document.getElementById("send-btn"),
    messages: document.getElementById("messages"),
    sidebar: document.getElementById("sidebar"),
    conversationList: document.getElementById("conversation-list"),
    newChatBtn: document.getElementById("new-chat-btn"),
    toggleBtn: document.getElementById("sidebar-toggle")
});

function scrollToEnd() {
    const { messages } = getUI();
    if (messages) {
        setTimeout(() => {
            messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
        }, 50);
    }
}

/* =====================================================
   MESSAGE RENDERING (Code Repair + Markdown)
===================================================== */
function addBubble(role, content) {
    const { messages } = getUI();
    if (!messages) return;

    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    
    if (typeof content === "string") {
        if (role === "assistant" && window.marked) {
            
            // 1. CODE REPAIR: Fixes broken AI characters and wraps text in code blocks
            let formatted = content
                // Fix: Detect SDK keywords and wrap in backticks if missing
                .replace(/(typescript|javascript|python)\s+(import|const|async|function)/g, '```$1\n$2')
                // Fix: AI typos (dashes to equals, commas to parens) inside code blocks
                .replace(/ – /g, ' = ')
                .replace(/Config, {/g, 'Config({')
                .replace(/Cedra, config/g, 'Cedra(config)')
                .replace(/console\.log, /g, 'console.log(')
                .replace(/runExample, /g, 'runExample()')
                .replace(/\.catch, /g, '.catch(')
                // Fix: Bullet point spacing
                .replace(/•/g, '\n* ')
                .replace(/(\d+\.)\s/g, '\n$1 ');

            // Ensure the code block is closed if the AI forgot
            if ((formatted.match(/```/g) || []).length % 2 !== 0) {
                formatted += '\n```';
            }

            bubble.innerHTML = window.marked.parse(formatted);
            
            // 2. APPLY SYNTAX HIGHLIGHTING
            bubble.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightElement(block);
                const pre = block.parentElement;
                if (!pre.querySelector('.copy-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'copy-btn';
                    btn.textContent = 'Copy';
                    btn.onclick = () => {
                        navigator.clipboard.writeText(block.innerText);
                        btn.textContent = 'Copied!';
                        setTimeout(() => btn.textContent = 'Copy', 2000);
                    };
                    pre.appendChild(btn);
                }
            });
        } else {
            bubble.textContent = content;
        }
    } else {
        // Handle cases where content is an HTML element (like the card)
        bubble.appendChild(content); 
    }

    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollToEnd();
}

/* =====================================================
   EXPLORER CARD LOGIC
===================================================== */
function renderExplorerCard(text) {
    if (!text || !text.includes("Transaction Hash")) return null;
    const lines = text.split("\n");
    const data = {};
    lines.forEach(l => {
        const [k, ...v] = l.split(":");
        if (k && v.length > 0) data[k.trim()] = v.join(":").trim();
    });

    const card = document.createElement("div");
    card.className = "assistant-card";
    card.style.cssText = "border: 1px solid #334155; background: #020617; padding: 15px; border-radius: 12px; width: 100%; margin-top: 8px; margin-bottom: 12px;";
    card.innerHTML = `<h4 style="margin:0 0 10px 0; color:#93c5fd; font-size:14px;">Transaction Detected</h4>`;
    
    ["Transaction Hash", "Sender", "Receiver", "Amount Transferred", "Status"].forEach(f => {
        if (data[f]) {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; gap:20px;";
            row.innerHTML = `<span style="color:#94a3b8">${f.replace("Transferred", "")}</span>
                             <span style="color:#60a5fa; word-break:break-all; text-align:right;">${data[f]}</span>`;
            card.appendChild(row);
        }
    });
    return card;
}

/* =====================================================
   CORE ACTIONS (Sidebar & API)
===================================================== */
window.loadSidebar = async function() {
    const { conversationList } = getUI();
    try {
        const res = await fetch("/api/conversations", { credentials: "include" });
        const convos = await res.json();
        conversationList.innerHTML = "";
        
        if (!Array.isArray(convos) || convos.length === 0) {
            conversationList.innerHTML = '<div style="padding:20px; font-size:12px; color:#475569; text-align:center;">No previous chats</div>';
            return;
        }

        convos.forEach(c => {
            const div = document.createElement("div");
            div.className = `conversation ${c.id === activeConversationId ? 'active' : ''}`;
            div.textContent = c.title || "New chat";
            div.onclick = () => switchConversation(c.id);
            conversationList.appendChild(div);
        });
    } catch (err) { console.error("Sidebar load error:", err); }
};

async function switchConversation(id) {
    if (!id) return;
    const { messages } = getUI();
    activeConversationId = id;
    try {
        const res = await fetch(`/api/conversations/${id}/messages`, { credentials: "include" });
        const data = await res.json();
        const messageArray = Array.isArray(data) ? data : (data.messages || []);
        
        messages.innerHTML = "";
        messageArray.forEach(m => addBubble(m.role, m.content));
        
        window.loadSidebar();
        scrollToEnd();
    } catch (err) { console.error("Switch error:", err); }
}

async function sendMessage() {
    const { input, messages } = getUI();
    const text = input.value.trim();
    if (!text) return;

    addBubble("user", text);
    input.value = "";

    const typing = document.createElement("div");
    typing.className = "message assistant";
    typing.id = "temp-typing";
    typing.innerHTML = '<div class="bubble">Thinking...</div>';
    messages.appendChild(typing);
    scrollToEnd();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message: text, conversationId: activeConversationId })
        });
        const data = await res.json();
        
        document.getElementById("temp-typing")?.remove();

        if (!activeConversationId && data.conversationId) {
            activeConversationId = data.conversationId;
            window.loadSidebar();
        }

        const card = renderExplorerCard(data.reply);
        if (card) messages.appendChild(card);
        addBubble("assistant", data.reply);
        
    } catch (err) {
        document.getElementById("temp-typing")?.remove();
        addBubble("assistant", "Connection error.");
    }
}

/* =====================================================
   INITIALIZATION
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const UI = getUI();
    UI.input?.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });
    UI.sendBtn?.addEventListener("click", sendMessage);
    UI.newChatBtn.onclick = () => { 
        activeConversationId = null; 
        UI.messages.innerHTML = ""; 
        window.loadSidebar(); 
    };
    UI.toggleBtn.onclick = () => UI.sidebar.classList.toggle("collapsed");
    
    window.loadSidebar();
});