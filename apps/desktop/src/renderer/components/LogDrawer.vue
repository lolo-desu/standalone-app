<template>
  <div class="log-drawer" :class="{ 'is-open': isOpen }">
    <div class="log-drawer-handle" @click="toggleDrawer">
      <span>{{ isOpen ? 'Close Logs' : 'Open Logs' }}</span>
    </div>
    
    <div class="log-drawer-content">
      <h2>Session Logs</h2>
      <div v-if="logs.length === 0" class="no-logs">No logs yet.</div>
      <div v-else class="log-entries">
        <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.kind">
          <div class="log-meta">
            <span class="log-speaker">{{ log.speaker }}</span>
            <span class="log-kind">[{{ log.kind }}]</span>
          </div>
          <div class="log-text">{{ log.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  logs: { kind: string; speaker: string; text: string }[];
}>();

const isOpen = ref(false);

const toggleDrawer = () => {
  isOpen.value = !isOpen.value;
};
</script>

<style scoped>
.log-drawer {
  position: fixed;
  right: -350px;
  top: 0;
  width: 350px;
  height: 100vh;
  background: #f9f9f9;
  box-shadow: -2px 0 5px rgba(0,0,0,0.1);
  transition: right 0.3s ease;
  z-index: 900;
  display: flex;
}

.log-drawer.is-open {
  right: 0;
}

.log-drawer-handle {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 100px;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 5px rgba(0,0,0,0.1);
}

.log-drawer-handle span {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.log-drawer-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-entry {
  padding: 10px;
  border-radius: 4px;
  background: white;
  border-left: 4px solid #ccc;
}

.log-entry.interact {
  border-left-color: #4caf50;
}

.log-entry.investigate {
  border-left-color: #2196f3;
}

.log-entry.move {
  border-left-color: #ff9800;
}

.log-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.85em;
  color: #666;
}

.log-speaker {
  font-weight: bold;
  color: #333;
}

.log-text {
  line-height: 1.4;
}

.no-logs {
  color: #999;
  text-align: center;
  margin-top: 20px;
}
</style>