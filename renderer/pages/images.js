// Images page — AI image generation

const IMAGE_MODELS = [
  { id: 'flux-2-flex', name: 'Flux 2 Flex', desc: 'Fast, high quality' },
  { id: 'imagen-4', name: 'Imagen 4', desc: 'Photorealistic' },
  { id: 'recraft-v3', name: 'Recraft V3', desc: 'Professional grade' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini Flash Image', desc: 'Multimodal (experimental)' },
  { id: 'gemini-3-pro-image', name: 'Gemini Pro Image', desc: 'Multimodal (experimental)' },
];

const ImagesPage = {
  isGenerating: false,

  render(container) {
    container.innerHTML = `
      <div id="imagesPage" class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Generate Images</h2>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Prompt</label>
              <textarea id="imagePrompt" rows="3" placeholder="Describe the image you want to create..."
                class="w-full resize-none bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 placeholder-neutral-400 focus:bg-white/90 focus:outline-none transition-all shadow-sm"></textarea>
            </div>

            <div class="flex gap-3">
              <div class="flex-1">
                <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Model</label>
                <select id="imageModel" class="w-full bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 focus:bg-white/90 focus:outline-none transition-all shadow-sm">
                  ${IMAGE_MODELS.map(m => `<option value="${m.id}">${m.name} — ${m.desc}</option>`).join('')}
                </select>
              </div>
              <div class="w-32">
                <label class="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5 block">Aspect</label>
                <select id="imageAspect" class="w-full bg-white/60 border border-neutral-200/50 rounded-xl px-3 py-2.5 text-sm text-neutral-700 focus:bg-white/90 focus:outline-none transition-all shadow-sm">
                  <option value="">Default</option>
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
            </div>

            <button id="generateBtn" class="w-full px-4 py-2.5 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4-1 1M4 15l1-1"/><path d="m2 2 20 20"/><path d="m9 5 .5-.5M5 9l-.5.5M14 14l.5-.5"/></svg> Generate Image
            </button>
          </div>

          <!-- Result area -->
          <div id="imageResult" class="hidden">
            <div id="imageLoading" class="hidden text-center py-8">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-400"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              <p class="text-sm text-neutral-500 mt-2">Generating image...</p>
            </div>
            <div id="imageOutput" class="hidden">
              <img id="generatedImage" class="w-full rounded-2xl border border-neutral-200/40 shadow-sm" />
              <div class="flex items-center justify-between mt-3">
                <span id="imageModelUsed" class="text-xs text-neutral-400"></span>
                <button id="saveImageBtn" class="px-4 py-2 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 transition-all shadow-sm flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save
                </button>
              </div>
            </div>
            <div id="imageError" class="hidden bg-rose-50 border border-rose-100 rounded-xl p-3 text-sm text-rose-700"></div>
          </div>

          <!-- History -->
          <div id="imageHistory" class="space-y-3"></div>
        </div>
      </div>
    `;

    this._bind(container);
  },

  _bind(container) {
    const prompt = container.querySelector('#imagePrompt');
    const model = container.querySelector('#imageModel');
    const aspect = container.querySelector('#imageAspect');
    const generateBtn = container.querySelector('#generateBtn');
    const result = container.querySelector('#imageResult');
    const loading = container.querySelector('#imageLoading');
    const output = container.querySelector('#imageOutput');
    const generatedImage = container.querySelector('#generatedImage');
    const imageModelUsed = container.querySelector('#imageModelUsed');
    const imageError = container.querySelector('#imageError');
    const saveImageBtn = container.querySelector('#saveImageBtn');
    const history = container.querySelector('#imageHistory');

    let lastImageData = null;

    generateBtn.addEventListener('click', async () => {
      const text = prompt.value.trim();
      if (!text || this.isGenerating) return;

      this.isGenerating = true;
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      result.classList.remove('hidden');
      loading.classList.remove('hidden');
      output.classList.add('hidden');
      imageError.classList.add('hidden');

      try {
        const res = await window.api.gateway.generateImage(
          text,
          model.value,
          aspect.value || undefined
        );

        if (res.success && res.image) {
          const src = `data:${res.mediaType || 'image/png'};base64,${res.image}`;
          generatedImage.src = src;
          imageModelUsed.textContent = res.model || model.value;
          lastImageData = { base64: res.image, mediaType: res.mediaType, prompt: text };

          loading.classList.add('hidden');
          output.classList.remove('hidden');

          // Auto-save to local media storage
          const ext = (res.mediaType || 'image/png').split('/')[1] || 'png';
          const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const filename = `${id}.${ext}`;
          try {
            await window.api.media.save({
              id, type: 'image', prompt: text, model: model.value,
              filename, mediaType: res.mediaType || 'image/png', base64Data: res.image,
            });
          } catch (e) { console.warn('Failed to save image locally:', e); }

          // Add to history
          const histItem = document.createElement('div');
          histItem.className = 'flex gap-3 p-3 rounded-2xl bg-white/50 border border-neutral-200/40 backdrop-blur-md hover:bg-white/80 transition-all';
          histItem.innerHTML = `
            <img src="${src}" class="w-16 h-16 rounded object-cover flex-shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-neutral-700 truncate">${text}</p>
              <p class="text-[10px] text-neutral-400">${model.value}</p>
            </div>
          `;
          history.prepend(histItem);
        } else {
          loading.classList.add('hidden');
          imageError.textContent = res.error || 'Failed to generate image';
          imageError.classList.remove('hidden');
        }
      } catch (err) {
        loading.classList.add('hidden');
        imageError.textContent = err.message || 'Unexpected error';
        imageError.classList.remove('hidden');
      } finally {
        this.isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Image';
      }
    });

    // Save image to disk via download
    saveImageBtn.addEventListener('click', () => {
      if (!lastImageData) return;
      const ext = lastImageData.mediaType?.split('/')[1] || 'png';
      const link = document.createElement('a');
      link.href = `data:${lastImageData.mediaType};base64,${lastImageData.base64}`;
      link.download = `iimagine-${Date.now()}.${ext}`;
      link.click();
    });

    prompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!generateBtn.disabled) generateBtn.click();
      }
    });
  }
};

window.ImagesPage = ImagesPage;
