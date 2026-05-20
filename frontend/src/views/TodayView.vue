<template>
  <div class="today-view">
    <Header title="今日待办" searchable @search="handleSearch">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增计划
        </GlassButton>
      </template>
    </Header>

    <div class="plans-list">
      <PlanCard
        v-for="plan in filteredPlans"
        :key="plan.id"
        :plan="plan"
        @complete="handleComplete"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <GlassCard v-if="filteredPlans.length === 0" class="empty-state">
      <p>暂无今日待办，点击右上角添加</p>
    </GlassCard>

    <GlassModal v-model="showAddModal" title="新增今日计划">
      <PlanForm @submit="handleAdd" @cancel="showAddModal = false" />
    </GlassModal>

    <GlassModal v-model="showEditModal" title="编辑计划">
      <PlanForm
        :plan="editingPlan"
        @submit="handleUpdate"
        @cancel="showEditModal = false"
      />
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlansStore } from '@/stores/plans'
import Header from '@/components/layout/Header.vue'
import PlanCard from '@/components/business/PlanCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import PlanForm from '@/components/forms/PlanForm.vue'

const plansStore = usePlansStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingPlan = ref(null)
const searchQuery = ref('')

const plans = computed(() => plansStore.todayPlans)

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value
  const query = searchQuery.value.toLowerCase()
  return plans.value.filter(p =>
    p.title.toLowerCase().includes(query) ||
    p.description?.toLowerCase().includes(query)
  )
})

onMounted(() => {
  plansStore.setCurrentType('today')
  plansStore.fetchPlans()
})

const handleSearch = (query) => {
  searchQuery.value = query
}

const handleComplete = async (plan) => {
  try {
    await plansStore.completePlan(plan.id)
  } catch (error) {
    console.error('Failed to complete plan:', error)
    alert('完成计划失败，请稍后重试')
  }
}

const handleEdit = (plan) => {
  editingPlan.value = plan
  showEditModal.value = true
}

const handleDelete = async (plan) => {
  if (confirm('确定要删除这个计划吗？')) {
    try {
      await plansStore.deletePlan(plan.id)
    } catch (error) {
      console.error('Failed to delete plan:', error)
      alert('删除计划失败，请稍后重试')
    }
  }
}

const handleAdd = async (plan) => {
  try {
    await plansStore.createPlan({
      ...plan,
      plan_type: 'today'
    })
    showAddModal.value = false
  } catch (error) {
    console.error('Failed to create plan:', error)
    alert('创建计划失败，请稍后重试')
  }
}

const handleUpdate = async (plan) => {
  try {
    await plansStore.updatePlan(editingPlan.value.id, plan)
    showEditModal.value = false
    editingPlan.value = null
  } catch (error) {
    console.error('Failed to update plan:', error)
    alert('更新计划失败，请稍后重试')
  }
}
</script>

<style scoped>
.today-view {
  min-height: 100vh;
}

.plans-list {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  margin: 2rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
