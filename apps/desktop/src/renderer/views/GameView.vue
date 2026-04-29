<template>
  <div class="prototype-container">
    <div class="background-image"></div>
    <div class="character-portrait"></div>
    
    <GameHud />
  </div>
</template>

<script setup lang="ts">
import GameHud from '../components/GameHud.vue';
</script>

<style>
@import url('https://static.zeoseven.com/zsft/510/main/result.css');

.prototype-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  font-family: 'PING FANG SAN SHENG', sans-serif;
  overflow: hidden;
  color: #5a4b53;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/bg-classroom.jpg');
  background-size: cover;
  background-position: center;
  z-index: 1;
}

.character-portrait {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 85vh;
  width: 100%;
  background-image: url('/char-luoluo.png');
  background-size: contain;
  background-position: bottom center;
  background-repeat: no-repeat;
  z-index: 2;
}
</style>