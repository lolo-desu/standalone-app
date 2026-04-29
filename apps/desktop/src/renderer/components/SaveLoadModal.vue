<template>
  <div v-if="isOpen" class="save-load-modal">
    <div class="modal-content">
      <h2>{{ mode === 'save' ? 'Save Game' : 'Load Game' }}</h2>
      
      <div class="slots-container">
        <!-- Quick Save Slot -->
        <div class="slot quick-slot">
          <h3>Quick Save</h3>
          <p v-if="quickSlotId">Saved</p>
          <p v-else>Empty</p>
          <button v-if="mode === 'save'" @click="handleQuickSave">Quick Save</button>
          <button v-if="mode === 'load' && quickSlotId" @click="handleQuickLoad">Quick Load</button>
        </div>

        <!-- Manual Slots -->
        <div class="slot manual-slot" v-for="slot in 5" :key="slot">
          <h3>Slot {{ slot }}</h3>
          <p v-if="manualSlots.includes(`slot_${slot}`)">Saved</p>
          <p v-else>Empty</p>
          <button v-if="mode === 'save'" @click="handleManualSave(`slot_${slot}`)">Save</button>
          <button v-if="mode === 'load' && manualSlots.includes(`slot_${slot}`)" @click="handleManualLoad(`slot_${slot}`)">Load</button>
        </div>
      </div>
      
      <button class="close-button" @click="close">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  mode: 'save' | 'load';
  quickSlotId: string | null;
  manualSlots: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'quickSave'): void;
  (e: 'quickLoad'): void;
  (e: 'manualSave', slotId: string): void;
  (e: 'manualLoad', slotId: string): void;
}>();

const close = () => emit('close');
const handleQuickSave = () => { emit('quickSave'); close(); };
const handleQuickLoad = () => { emit('quickLoad'); close(); };
const handleManualSave = (id: string) => { emit('manualSave', id); close(); };
const handleManualLoad = (id: string) => { emit('manualLoad', id); close(); };
</script>

<style scoped>
.save-load-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 400px;
  max-width: 80%;
  max-height: 80vh;
  overflow-y: auto;
}

.slots-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.slot {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-button {
  width: 100%;
  padding: 10px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}
</style>