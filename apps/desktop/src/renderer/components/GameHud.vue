<template>
  <!-- Vertical Date Text on Left -->
  <div class="vertical-date">
    <div class="text">四月十七日 - 放学后</div>
  </div>

  <!-- Combined Bottom Dialogue Area -->
  <div class="bottom-area">
    <div class="name-text">络络</div>
    <div class="text-content">
      打......打扰了。那个，可以找一下......林明霜同学吗？
    </div>
    
    <div class="bottom-widgets">
      <div class="widget">⏵ AUTO</div>
      <div class="widget">⏭ SKIP</div>
      <div class="widget">📜 LOG</div>
      <div class="widget">⚙ MENU</div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
.vertical-date {
  position: absolute;
  top: 8vh;
  left: 40px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 1), 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.6);
}

.vertical-date .text {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 15px;
  letter-spacing: 6px;
}

.vertical-date .decoration {
  font-size: 14px;
  opacity: 0.9;
}

.bottom-area {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 30;
  background: rgba(255, 250, 252, 0.65); /* Very light pink/white frosted glass */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  mask-image: linear-gradient(to bottom, transparent 0%, black 40%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 40%);
  min-height: 35vh;
  padding: 7vh 15vw 4vh;
  box-sizing: border-box;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.bottom-area::before {
  content: '❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀ ❀';
  position: absolute;
  top: -50px;
  left: -50px;
  width: 150%;
  height: 200%;
  font-size: 120px;
  color: rgba(255, 255, 255, 0.1);
  transform: rotate(-15deg);
  pointer-events: none;
  z-index: 0;
  line-height: 1.5;
  letter-spacing: 50px;
  word-wrap: break-word;
}

.bottom-area:hover .bottom-widgets {
  opacity: 1;
}

.name-text {
  position: relative;
  z-index: 1;
  font-size: 43px;
  font-weight: normal;
  color: #f0718d; /* Pleasant readable pink */
  margin-top: 47px;
  margin-bottom: 18px;
  letter-spacing: 4px;
  text-shadow: 0 1px 1px rgba(255,255,255,0.8);
}

.text-content {
  position: relative;
  z-index: 1;
  font-size: 24px;
  line-height: 3;
  letter-spacing: 2px;
  color: #4a3b43;
}

.bottom-widgets {
  position: absolute;
  z-index: 1;
  bottom: 30px;
  right: 40px;
  display: flex;
  gap: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.widget {
  color: #f0718d; /* Match the name text for UI consistency */
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  letter-spacing: 2px;
  transition: opacity 0.2s, transform 0.2s;
  text-shadow: 0 1px 1px rgba(255,255,255,0.8);
}

.widget:hover {
  opacity: 0.8;
  transform: scale(1.05);
}
</style>