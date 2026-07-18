const fs = require('fs');
const cssPath = './style.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Find the corrupted .btn-fs-action span section and replace everything from there to end
const marker = '.btn-fs-action span {';
const idx = css.indexOf(marker);
if (idx < 0) {
    console.log('ERROR: marker not found');
    process.exit(1);
}

const goodPart = css.substring(0, idx);
const newEnd = `
.btn-fs-action span {
    font-size: 11px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 1px;
}
.btn-fs-action:hover {
    border-color: var(--accent);
    background: rgba(186, 255, 0, 0.05);
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .quick-actions-grid {
        grid-template-columns: 1fr;
    }
}

/* Switch Style */
.fs-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    margin-left: 10px;
}
.fs-switch input { opacity: 0; width: 0; height: 0; }
.fs-switch .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #333;
    transition: .4s;
    border-radius: 20px;
    border: 1px solid var(--border-color);
}
.fs-switch .slider:before {
    position: absolute;
    content: '';
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: #888;
    transition: .4s;
    border-radius: 50%;
}
.fs-switch input:checked + .slider {
    background-color: var(--accent);
    border-color: var(--accent);
}
.fs-switch input:checked + .slider:before {
    transform: translateX(16px);
    background-color: #000;
}

/* Mobile Optimization for Identity Editor */
@media (max-width: 768px) {
    .identity-editor-layout { flex-direction: column-reverse !important; }
    .identity-preview-sidebar { position: relative !important; top: 0 !important; width: 100% !important; margin-bottom: 20px; }
    .identity-controls { width: 100% !important; min-width: unset !important; }
}

/* ============================================================
   CHATBOT STYLES
   ============================================================ */
.chatbot-trigger {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--accent);
    color: #000;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    cursor: pointer;
    z-index: 9990;
    box-shadow: 0 4px 20px var(--accent-glow), 0 0 40px var(--accent-glow);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: chatbotPulse 2s infinite;
}
.chatbot-trigger:hover {
    transform: scale(1.12);
    box-shadow: 0 6px 30px var(--accent-glow), 0 0 60px var(--accent-glow);
}
.chatbot-trigger .notification-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff4d4d;
    color: #fff;
    font-size: 10px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-main);
}
@keyframes chatbotPulse {
    0%, 100% { box-shadow: 0 4px 20px var(--accent-glow); }
    50% { box-shadow: 0 4px 30px var(--accent-glow), 0 0 50px var(--accent-glow); }
}

.chatbot-panel {
    position: fixed;
    bottom: 100px;
    right: 30px;
    width: 380px;
    max-height: 520px;
    background: #0d0f0d;
    border: 1px solid var(--accent);
    border-radius: 16px;
    display: none;
    flex-direction: column;
    z-index: 9995;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 20px var(--accent-glow);
    overflow: hidden;
    animation: slideUp 0.3s ease;
}
.chatbot-panel.open { display: flex; }
.chatbot-panel .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(186,255,0,0.12), rgba(186,255,0,0.04));
    border-bottom: 1px solid rgba(186,255,0,0.2);
}
.chatbot-panel .chat-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.chatbot-panel .chat-header i { color: var(--accent); font-size: 22px; cursor: pointer; transition: transform 0.2s; }
.chatbot-panel .chat-header i:hover { transform: rotate(90deg); }
.chatbot-panel .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 360px;
    min-height: 200px;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) transparent;
}
.chatbot-panel .chat-messages .msg {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.5;
    animation: fadeInMsg 0.3s ease;
}
.chatbot-panel .chat-messages .msg.ia {
    background: linear-gradient(135deg, rgba(186,255,0,0.1), rgba(186,255,0,0.03));
    border: 1px solid rgba(186,255,0,0.15);
    color: #ddd;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
}
.chatbot-panel .chat-messages .msg.user {
    background: var(--accent);
    color: #000;
    font-weight: 600;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
}
.chatbot-panel .chat-messages .msg.typing {
    background: rgba(255,255,255,0.04);
    border: 1px solid #333;
    color: #888;
    align-self: flex-start;
    font-style: italic;
}
@keyframes fadeInMsg {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
.chatbot-panel .chat-input-area {
    display: flex;
    gap: 8px;
    padding: 12px 14px;
    border-top: 1px solid #222;
    background: rgba(0,0,0,0.4);
}
.chatbot-panel .chat-input-area input {
    flex: 1;
    background: #1a1c1a;
    border: 1px solid #333;
    color: #fff;
    padding: 10px 14px;
    border-radius: 25px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.3s;
}
.chatbot-panel .chat-input-area input:focus { border-color: var(--accent); }
.chatbot-panel .chat-input-area button {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

@media (max-width: 500px) {
    .chatbot-panel { width: calc(100vw - 20px); right: 10px; bottom: 80px; max-height: 70vh; }
    .chatbot-trigger { bottom: 15px; right: 15px; width: 52px; height: 52px; font-size: 24px; }
}
`;

fs.writeFileSync(cssPath, goodPart + newEnd, 'utf8');
console.log('CSS fixed successfully! File size:', (goodPart + newEnd).length);
