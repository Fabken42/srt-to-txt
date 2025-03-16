<template>
  <div class="container">
    <input type="file" @change="handleFileUpload" accept=".srt" />
    <button v-if="dialogues.length" @click="downloadTxt">Baixar .txt</button>
    
    <div class="copy-controls" v-if="dialogues.length">
      <div class="input-group">
        <label for="linha-inicial">Linha inicial:</label>
        <input id="linha-inicial" type="number" v-model.number="startLine" placeholder="Linha inicial" min="1" :max="dialogues.length"/>
      </div>
      <div class="input-group">
        <label for="numero-linhas">Número de linhas:</label>
        <input id="numero-linhas" type="number" v-model.number="numLines" placeholder="Número de linhas" min="1"/>
      </div>
      <button @click="copyToClipboard">Copiar</button>
    </div>
 
    <h1 v-if="fileName">{{ fileName }}</h1>
    
    <div class="dialogues" v-if="dialogues.length">
      <p v-for="(line, index) in dialogues" :key="index" :ref="`dialogue-${index + 1}`">
        <span class="line-number">{{ index + 1 }}.</span> {{ line }}
      </p>
    </div>

    <button class="scroll-to-top" @click="scrollToTop">
      ↑
    </button>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification';

export default {
  setup(){
    const toast = useToast();
    return {toast};
  },
  mounted() {
  this.$nextTick(() => {
    const savedPosition = localStorage.getItem("scrollPosition");
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition));
    }
  });
},
  data() {
    return {
      fileName: JSON.parse(localStorage.getItem('fileName')) || '',
      dialogues: JSON.parse(localStorage.getItem('dialogues')) || [],
      startLine: JSON.parse(localStorage.getItem('startLine')) || 1,
      numLines: JSON.parse(localStorage.getItem('numLines')) || 80
    };
  },
  watch: {
    fileName(newVal) {
      localStorage.setItem('fileName', JSON.stringify(newVal));
    },
    dialogues(newVal) {
      localStorage.setItem('dialogues', JSON.stringify(newVal));
    },
    startLine(newVal) {
      localStorage.setItem('startLine', JSON.stringify(newVal));
    },
    numLines(newVal) {
      localStorage.setItem('numLines', JSON.stringify(newVal));
    }
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file && file.name.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.processSrt(e.target.result);
        };
        reader.readAsText(file); 
        
        this.fileName = file.name;
        this.startLine = 1;
        this.numLines = 80;
      } else {
        this.toast.error("Por favor, selecione um arquivo .srt válido.");
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
      
      this.dialogues = cleanedLines;
    },
    downloadTxt() {
      const content = this.dialogues.map((line, index) => `${index + 1}. ${line}`).join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'dialogos.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    copyToClipboard() {
      if (this.startLine && this.numLines) {
        const start = this.startLine - 1;
        const end = start + this.numLines;
        const selectedText = this.dialogues.slice(start, end).join('\n');
        
        if(this.startLine+this.numLines < this.dialogues.length)
          this.startLine += this.numLines;
        else
          this.startLine = this.dialogues.length;

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
    },
  }
};
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: auto;
  text-align: center;
  padding-top: 60px;
}
button {
  margin-top: 10px;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 1em;
}
button:hover {
  background-color: #0056b3;
}
.input-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.copy-controls {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 10px;
  align-items: center;
  z-index: 1000;
}
.copy-controls input {
  padding: 8px;
  font-size: 1em;
  border: 1px solid #ccc;
  border-radius: 5px;
  text-align: center;
}
.dialogues {
  margin-top: 20px;
  text-align: left;
}
p {
  font-size: 1.5em;
  background: #f4f4f4;
  padding: 5px;
  border-radius: 5px;
  margin: 5px 0;
  display: flex;
  align-items: center;
}
.line-number {
  font-weight: bold;
  margin-right: 10px;
}

.scroll-to-top {
  position: fixed;
  bottom: 20px; /* Ajuste conforme necessário */
  right: 20px; /* Ajuste conforme necessário */
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(128, 128, 128, 0.7); /* Cinza com opacidade reduzida */
  color: white;
  font-size: 24px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.scroll-to-top:hover {
  background-color: rgba(128, 128, 128, 0.9);
}
</style>
