// The inbox controller owns grouping and filtering. Keep presentation independent of live message updates.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 900px) {
      #dw-chat-list .dw-chat-search input:focus-visible,
      #dw-chat-list button:focus-visible {
        outline: 2px solid #35dfba;
        outline-offset: 2px;
      }
      #dw-chat-list #dw-chat-rows button:active { background: #16384a; }
    }
  `;
  document.head.append(style);
})();
