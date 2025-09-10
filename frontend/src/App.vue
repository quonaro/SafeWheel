<template>
  <div id="app">
    <div class="app-container">
      <div class="sidebar">
        <div class="sidebar-content">
          <nav class="nav-menu">
            <div class="nav-item" :class="{ active: activeTab === 'teams' }" @click="setActiveTab('teams')">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'stages' }" @click="setActiveTab('stages')">
              <el-icon><List /></el-icon>
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'results' }" @click="setActiveTab('results')">
              <el-icon><Edit /></el-icon>
            </div>
            <div class="nav-item" :class="{ active: activeTab === 'standings' }" @click="setActiveTab('standings')">
              <el-icon><TrophyBase /></el-icon>
            </div>
          </nav>
        </div>
      </div>
      
      <div class="main-content">
        <div class="content-card">
          <CompetitionsManager 
            :active-tab="activeTab" 
            @tab-change="handleTabChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CompetitionsManager from './components/CompetitionsManager.vue'
import { UserFilled, List, Edit, TrophyBase } from '@element-plus/icons-vue'

const activeTab = ref('teams')

const setActiveTab = (tab) => {
  activeTab.value = tab
}

const handleTabChange = (tab) => {
  activeTab.value = tab
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  background: #f8fafc;
  overflow: hidden;
}

.app-container {
  display: flex;
  height: 100vh;
  gap: 20px;
  padding: 20px;
}

.sidebar {
  width: 80px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: center;
}


.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.nav-item {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #6b7280;
  margin-bottom: 8px;
  position: relative;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
  transform: translateY(-2px);
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.nav-item .el-icon {
  font-size: 20px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 30px;
  height: 100%;
  overflow: hidden;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
