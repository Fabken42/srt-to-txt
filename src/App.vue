
<template>
  <div class="container">
    <div class="top-controls">
      <!-- Seção Esquerda - Upload e Nome do Arquivo -->
      <div class="left-section">
        <div class="file-controls">
          <label class="custom-file-upload">
            <input type="file" @change="handleFileUpload" accept=".srt" />
            📁 Carregar SRT
          </label>
          <div v-if="currentSlot.fileName" class="file-info">
            <span class="file-name">{{ currentSlot.fileName }}</span>
            <button @click="clearSlot" class="clear-btn">×</button>
          </div>
        </div>
      </div>

      <!-- Seção Central - Controles de Cópia -->
      <div class="center-section">
        <div class="copy-controls" v-if="currentSlot.dialogues?.length">
          <div class="input-group">
            <div class="input-wrapper">
              <label>Linha inicial:</label>
              <input type="number" v-model.number="currentSlot.startLine" min="1"
                :max="currentSlot.dialogues?.length" />
            </div>
            <div class="input-wrapper">
              <label>Linhas:</label>
              <input type="number" v-model.number="currentSlot.numLines" min="1" />
            </div>
            <button @click="copyToClipboard" class="copy-btn">
              📋 Copiar
            </button>
          </div>
        </div>
      </div>

      <!-- Seção Direita - Slots e Configurações -->
      <div class="right-section">
        <div class="slot-management">
          <div class="slot-selector">
            <button v-for="(slot, index) in slots" :key="slot.id" @click="currentSlotIndex = index"
              :class="{ active: currentSlotIndex === index }" class="slot-btn">
              {{ slot.name || `Slot ${index + 1}` }}
            </button>
          </div>
          <div class="slot-actions">
            <input type="text" v-model="currentSlot.name" placeholder="Nome do slot" @change="saveSlotName"
              class="slot-name-input" />
            <button @click="downloadTxt" v-if="currentSlot.dialogues?.length" class="download-btn">
              ⬇️ TXT
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Área de Diálogos -->
    <div class="dialogues-container" v-if="currentSlot.dialogues.length">
      <div class="dialogues">
        <p v-for="(line, index) in currentSlot.dialogues" :key="index" :ref="`dialogue-${index + 1}`"
          class="dialogue-line">
          <span class="line-number">{{ index + 1 }}.</span>
          <span class="dialogue-text">{{ line }}</span>
        </p>
      </div>
    </div>

    <!-- Botão de Scroll e Loading -->
    <button class="scroll-to-top" @click="scrollToTop" v-show="showScrollButton">
      ↑
    </button>
    <div v-if="loading" class="loading-overlay">
      <div class="loader"></div>
    </div>
  </div>
</template>
<script>
import { useToast } from 'vue-toastification';

export default {
  setup() {
    const toast = useToast();
    return { toast };
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll);
    this.handleScroll();
    // Validação dos slots existentes
    this.slots = this.slots.map(slot => ({
      id: slot.id || 0,
      name: slot.name || `Slot ${slot.id + 1}`,
      fileName: slot.fileName || '',
      dialogues: slot.dialogues || [],
      startLine: slot.startLine || 1,
      numLines: slot.numLines || 80
    }));

    this.$nextTick(() => {
      const savedPosition = localStorage.getItem("scrollPosition");
      if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition));
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  },
  data() {
    return {
      loading: false,
      showScrollButton: false,
      lastScrollPosition: 0,
      editingSlotIndex: -1,
      currentSlotIndex: JSON.parse(localStorage.getItem('currentSlotIndex')) || 0,
      slots: JSON.parse(localStorage.getItem('srtSlots')) || Array.from({ length: 3 }, (_, i) => ({
        id: i,
        name: `Slot ${i + 1}`,
        fileName: '',
        dialogues: [], // Garante que sempre existirá
        startLine: 1,
        numLines: 80
      }))
    };
  },
  computed: {
    currentSlot() {
      return this.slots[this.currentSlotIndex];
    }
  },
  watch: {
    slots: {
      handler(newVal) {
        localStorage.setItem('srtSlots', JSON.stringify(newVal));
      },
      deep: true
    },
    currentSlotIndex(newVal) {
      localStorage.setItem('currentSlotIndex', JSON.stringify(newVal));
    }
  },
  methods: {
    saveSlotName() {
      // A atualização é automática pelo v-model
      this.toast.success("Nome do slot atualizado!");
    },
    startEditing(index) {
      this.editingSlotIndex = index;
      this.$nextTick(() => {
        if (this.$refs.slotInput && this.$refs.slotInput[index]) {
          this.$refs.slotInput[index].focus();
        }
      });
    },
    finishEditing() {
      this.editingSlotIndex = -1;
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file && file.name.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.processSrt(e.target.result);
        };
        reader.onerror = (e) => {
          console.error("Erro na leitura do arquivo:", e.target.error); // Log 2
        };
        reader.readAsText(file, 'Windows-1252'); // Experimente também 'ISO-8859-1' se não funcionar

        this.currentSlot.fileName = file.name;
        this.currentSlot.startLine = 1;
        this.currentSlot.dialogues = [];
        this.currentSlot.numLines = 80;
      } else {
        this.toast.error("Por favor, selecione um arquivo .srt válido.");
      }
    },

    clearSlot() {
      this.currentSlot.fileName = '';
      this.currentSlot.dialogues = [];
      this.toast.info('Slot limpo com sucesso');
    },

    handleScroll() {
      this.showScrollButton = window.scrollY > 200;
      if (Math.abs(window.scrollY - this.lastScrollPosition) > 50) {
        this.lastScrollPosition = window.scrollY;
        localStorage.setItem("scrollPosition", window.scrollY);
      }
    },
    processSrt(content) {
      const lines = content.split('\n');
      const cleanedLines = [];
      let skipNext = false;

      lines.forEach(line => {
        if (line.match(/^\d+$/)) {
          skipNext = true;
        } else if (line.match(/^\d{2}:\d{2}:\d{2},\d{3}/)) {
          skipNext = false;
        } else if (line.trim() !== "" && !skipNext) {
          cleanedLines.push(line.trim());
        }
      });

      console.log("Linhas processadas:", cleanedLines); // Log 3
      this.currentSlot.dialogues = cleanedLines;
    },
    downloadTxt() {
      const content = this.currentSlot.dialogues.map((line, index) => `${index + 1}. ${line}`).join('\n');
      console.log("Conteúdo antes do Blob:", content); // Log 4
      const blob = new Blob(["\uFEFF" + content], { type: 'text/plain;charset=utf-8' }); // BOM + charset explícito
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'dialogos.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    copyToClipboard() {
      if (this.currentSlot.startLine && this.currentSlot.numLines) { // Corrigido aqui
        const start = this.currentSlot.startLine - 1;
        const end = start + this.currentSlot.numLines;
        const selectedText = this.currentSlot.dialogues.slice(start, end).join('\n'); // Corrigido aqui

        if (this.currentSlot.startLine + this.currentSlot.numLines < this.currentSlot.dialogues.length)
          this.currentSlot.startLine += this.currentSlot.numLines;
        else
          this.currentSlot.startLine = this.currentSlot.dialogues.length;

        if (selectedText) {
          navigator.clipboard.writeText(selectedText).then(() => {
            this.toast.success("Texto copiado para a área de transferência!");
            this.scrollToLine(end);
          }).catch(err => {
            this.toast.error("Erro ao copiar o texto");
            console.error("Erro ao copiar", err);
          });
        }
      }
    },
    scrollToLine(lineNumber) {
      this.$nextTick(() => {
        const element = this.$refs[`dialogue-${lineNumber - 1}`];
        if (element && element[0]) {
          element[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });

      window.addEventListener("scroll", () => {
        localStorage.setItem("scrollPosition", window.scrollY);
      });
    }
  }
};
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: auto;
  padding-top: 120px;
}

/* Top Controls */
.top-controls {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f8f9fa;
  z-index: 1000;
  padding: 15px 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
  align-items: center;
}

.file-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-file-upload {
  cursor: pointer;
  padding: 8px 15px;
  background: #e9ecef;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all ease-in-out .2s;
}

.custom-file-upload:hover {
  background: #dee2e6;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.copy-controls .input-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-wrapper input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.slot-management {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slot-selector {
  display: flex;
  gap: 6px;
}

.slot-btn {
  padding: 6px 12px;
  background: #e9ecef;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  font-size: 0.9em;
  transition: all 0.2s;
}

.slot-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
  transform: scale(1.05);
}

.slot-actions {
  display: flex;
  gap: 8px;
}

.slot-name-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Diálogos */
.dialogues-container {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dialogue-line {
  padding: 12px 15px;
  margin: 8px 0;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  gap: 10px;
  transition: transform 0.2s;
}

.dialogue-line:hover {
  transform: translateX(5px);
}

.line-number {
  color: #6c757d;
  font-weight: 500;
}

/* Botões Aprimorados */
button {
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.copy-btn {
  background: #28a745 !important;
  padding: 8px 15px;
}

.download-btn {
  background: #17a2b8 !important;
}

.clear-btn {
  background: #dc3545 !important;
  padding: 2px 8px;
  border-radius: 50%;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .top-controls {
    grid-template-columns: 1fr;
    padding: 15px;
  }

  .copy-controls .input-group {
    flex-direction: column;
  }

  .slot-selector {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
