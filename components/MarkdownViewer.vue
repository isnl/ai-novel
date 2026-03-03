<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

const renderedHtml = computed((): string => {
  if (!props.content) return ''
  return marked.parse(props.content, { async: false }) as string
})
</script>

<template>
  <div class="md-render" v-html="renderedHtml" />
</template>

<style scoped>
.md-render {
  font-family: var(--font-ui);
  font-size: var(--text-md);
  line-height: var(--leading-loose);
  color: var(--text);
  word-break: break-word;
}

.md-render :deep(h1) { font-size: var(--text-2xl); font-weight: 700; margin: var(--space-6) 0 var(--space-3); }
.md-render :deep(h2) { font-size: var(--text-xl); font-weight: 600; margin: var(--space-5) 0 var(--space-3); }
.md-render :deep(h3) { font-size: var(--text-lg); font-weight: 600; margin: var(--space-4) 0 var(--space-2); }
.md-render :deep(h4) { font-size: var(--text-md); font-weight: 600; margin: var(--space-3) 0 var(--space-2); }

.md-render :deep(p) { margin: 0 0 var(--space-3); }

.md-render :deep(ul),
.md-render :deep(ol) {
  margin: 0 0 var(--space-3);
  padding-left: var(--space-6);
}
.md-render :deep(li) { margin-bottom: var(--space-1); }

.md-render :deep(blockquote) {
  margin: var(--space-3) 0;
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--primary);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
}
.md-render :deep(blockquote p) { margin: 0; }

.md-render :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--surface-3);
  padding: 1px 4px;
  border-radius: var(--radius-xs);
}

.md-render :deep(pre) {
  margin: var(--space-3) 0;
  padding: var(--space-4);
  background: var(--surface-3);
  border-radius: var(--radius-sm);
  overflow-x: auto;
}
.md-render :deep(pre code) { background: none; padding: 0; }

.md-render :deep(hr) {
  border: none;
  border-top: 1px solid var(--divider);
  margin: var(--space-6) 0;
}

.md-render :deep(strong) { font-weight: 700; }

.md-render :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-3) 0;
}
.md-render :deep(th),
.md-render :deep(td) {
  border: 1px solid var(--divider);
  padding: var(--space-2) var(--space-3);
  text-align: left;
}
.md-render :deep(th) { background: var(--surface-2); font-weight: 600; }
</style>
