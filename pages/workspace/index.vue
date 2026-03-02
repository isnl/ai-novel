<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const ws = useWorkspaceStore()

const form = reactive({
  title: '',
  genre: '玄幻',
  style: '沉浸叙事',
  targetWords: 120000
})

const creating = ref(false)

await ws.fetchProjects()

async function createProject() {
  if (!form.title.trim()) return
  creating.value = true
  try {
    const project = await ws.createProject({
      title: form.title,
      genre: form.genre,
      style: form.style,
      targetWords: form.targetWords
    })
    form.title = ''
    await navigateTo(`/workspace/project/${project.id}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <section class="card">
      <h1>创作工作台</h1>
      <p class="muted">从这里创建你的新项目，进入世界观、大纲与章节循环。</p>
      <div class="new-project-grid">
        <input v-model="form.title" class="input" placeholder="书名" />
        <input v-model="form.genre" class="input" placeholder="题材" />
        <input v-model="form.style" class="input" placeholder="风格" />
        <input v-model.number="form.targetWords" class="input" type="number" min="1000" max="500000" />
        <button class="btn btn-primary" :disabled="creating" @click="createProject">
          {{ creating ? '创建中...' : '创建项目' }}
        </button>
      </div>
    </section>

    <section class="list-sec">
      <h2>我的项目</h2>
      <div v-if="!ws.projects.length" class="card muted">你还没有项目，先创建一本新书。</div>
      <div v-else class="project-grid">
        <NuxtLink v-for="project in ws.projects" :key="project.id" :to="`/workspace/project/${project.id}`" class="card item">
          <h3>{{ project.title }}</h3>
          <p class="muted">{{ project.genre }} · {{ project.style }}</p>
          <div class="meta-row">
            <StatusBadge :text="project.status" />
            <span class="muted">目标 {{ project.targetWords }} 字</span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
h1 {
  margin: 0;
}

.new-project-grid {
  margin-top: var(--space-4);
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: var(--space-3);
}

.list-sec {
  margin-top: var(--space-6);
}

.project-grid {
  margin-top: var(--space-3);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.item h3 {
  margin: 0 0 var(--space-2);
}

.meta-row {
  margin-top: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

@media (max-width: 900px) {
  .new-project-grid {
    grid-template-columns: 1fr;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
