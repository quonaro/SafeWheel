<template>
  <div id="app">
    <el-container>
      <el-header class="header">
        <h1>SafeWheel - Управление колесами</h1>
      </el-header>
      
      <el-main>
        <WheelManager />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import WheelManager from './components/WheelManager.vue'
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.el-main {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: calc(100vh - 60px);
}
</style>
