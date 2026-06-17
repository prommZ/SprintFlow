import { useState, useEffect, useMemo } from 'react';
import { tasksAPI, sprintsAPI } from '@/services/api';
import { useToast } from '@/components/shared/Toast';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { STATUSES, getPriorityColor, cn, formatStatusLabel } from '@/lib/utils';
import {
  DndContext, closestCorners, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Clock } from 'lucide-react';

function SortableTask({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="border-2 border-dashed border-accent/30 bg-accent/5 rounded-lg h-[92px] w-full"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-border-hover transition-all group shadow-sm hover:shadow"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`badge text-[10px] ${getPriorityColor(task.priority)}`}>{task.priority}</span>
            {task.dueDate && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.estimatedHours > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {task.estimatedHours}h
              </span>
            )}
          </div>
          {task.tags?.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {task.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-surface-3 rounded text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskOverlay({ task }) {
  if (!task) return null;
  return (
    <div className="bg-card border-2 border-accent rounded-lg p-3 shadow-2xl shadow-accent/10 rotate-2 w-[260px]">
      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
      <span className={`badge text-[10px] mt-1 ${getPriorityColor(task.priority)}`}>{task.priority}</span>
    </div>
  );
}

function KanbanColumnItems({ status, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-2 min-h-[450px] p-2 rounded-lg transition-colors duration-200",
        isOver ? "bg-accent/5 border border-dashed border-accent/20" : "bg-transparent"
      )}
    >
      {children}
    </div>
  );
}

const COLUMN_COLORS = {
  'backlog': 'border-t-muted-foreground/30',
  'todo': 'border-t-foreground/30',
  'inprogress': 'border-t-accent',
  'review': 'border-t-warning',
  'done': 'border-t-success',
};

export default function Board() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [activeSprint, setActiveSprint] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, sprintRes] = await Promise.all([
        tasksAPI.getAll({ limit: 200 }),
        sprintsAPI.getActive()
      ]);
      setTasks(tasksRes.data);
      setActiveSprint(sprintRes.data);
    } catch { toast.error('Failed to load board'); }
    finally { setLoading(false); }
  };

  const columns = useMemo(() => {
    const cols = {};
    STATUSES.forEach(status => {
      cols[status] = tasks
        .filter(t => t.status === status)
        .sort((a, b) => a.order - b.order);
    });
    return cols;
  }, [tasks]);

  const findContainer = (id) => {
    if (STATUSES.includes(id)) return id;
    for (const status of STATUSES) {
      if (columns[status]?.find(t => t._id === id)) return status;
    }
    return null;
  };

  // Helper to reorder tasks in the same column
  const reorderTasks = (tasksList, activeId, overId) => {
    const activeIndex = tasksList.findIndex(t => t._id === activeId);
    const overIndex = tasksList.findIndex(t => t._id === overId);

    if (activeIndex !== -1 && overIndex !== -1) {
      const moved = arrayMove(tasksList, activeIndex, overIndex);
      return updateTaskOrderInList(moved);
    }
    return tasksList;
  };

  // Helper to move a task from one column to another
  const moveTask = (tasksList, activeId, overId, activeContainer, overContainer) => {
    const activeIndex = tasksList.findIndex(t => t._id === activeId);
    const activeTask = tasksList[activeIndex];
    if (!activeTask) return tasksList;

    const isOverContainer = STATUSES.includes(overId);
    const updatedActiveTask = { ...activeTask, status: overContainer };

    const newTasks = [...tasksList];
    newTasks.splice(activeIndex, 1);

    // Find the drop index within the target container
    let finalOverIndex;
    if (isOverContainer) {
      // If hovering over empty column space, append to the end of that column
      finalOverIndex = newTasks.filter(t => t.status === overContainer).length;
    } else {
      // Find the index of the task we are hovering over in the clean list (excluding the active task)
      const targetColumnTasks = newTasks.filter(t => t.status === overContainer);
      const targetTaskIdx = targetColumnTasks.findIndex(t => t._id === overId);
      
      // Map this container index back to the global index in newTasks
      let colIdx = 0;
      finalOverIndex = newTasks.findIndex(t => {
        if (t.status === overContainer) {
          if (colIdx === targetTaskIdx) return true;
          colIdx++;
        }
        return false;
      });
      if (finalOverIndex === -1) {
        finalOverIndex = newTasks.length;
      }
    }

    newTasks.splice(finalOverIndex, 0, updatedActiveTask);
    return updateTaskOrderInList(newTasks);
  };

  // Re-calculate orders (0, 1, 2...) for tasks in each status group
  const updateTaskOrderInList = (tasksList) => {
    const statusGroups = {};
    STATUSES.forEach(status => {
      statusGroups[status] = [];
    });

    tasksList.forEach(task => {
      if (statusGroups[task.status]) {
        statusGroups[task.status].push(task);
      }
    });

    const updatedTasks = [];
    STATUSES.forEach(status => {
      statusGroups[status].forEach((task, index) => {
        updatedTasks.push({ ...task, order: index });
      });
    });

    // Keep any other tasks that don't match the valid statuses intact
    tasksList.forEach(task => {
      if (!STATUSES.includes(task.status)) {
        updatedTasks.push(task);
      }
    });

    return updatedTasks;
  };

  // Persist order payload to MongoDB
  const updateTaskOrder = async (updatedTasks) => {
    const reorderPayload = updatedTasks.map(t => ({
      _id: t._id,
      status: t.status,
      order: t.order
    }));

    try {
      await tasksAPI.reorder(reorderPayload);
      console.log("Database order synchronization complete");
    } catch (err) {
      console.error("Failed to save board order:", err);
      toast.error('Failed to save board order');
      loadData();
    }
  };

  const handleDragStart = (event) => {
    const task = tasks.find(t => t._id === event.active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer !== overContainer) {
      setTasks(prev => {
        return moveTask(prev, activeId, overId, activeContainer, overContainer);
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    let finalTasks = tasks;

    if (activeContainer === overContainer) {
      // Reordering in the same column
      setTasks(prev => {
        finalTasks = reorderTasks(prev, activeId, overId);
        updateTaskOrder(finalTasks);
        return finalTasks;
      });
    } else {
      // Moving to a different column (already shifted in handleDragOver, but needs database sync)
      updateTaskOrder(tasks);
    }
  };

  if (loading) return <div className="page-container"><LoadingSkeleton type="card" count={5} /></div>;

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Scrum Board</h1>
          <p className="page-subtitle">
            {activeSprint ? `Sprint: ${activeSprint.name}` : 'Drag and drop to organize your tasks'}
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[500px]">
          {STATUSES.map(status => (
            <div key={status} className={cn('kanban-column border-t-2', COLUMN_COLORS[status])}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{formatStatusLabel(status)}</h3>
                <span className="text-xs bg-surface-3 text-muted-foreground px-2 py-0.5 rounded-full">
                  {columns[status]?.length || 0}
                </span>
              </div>

              <SortableContext
                items={columns[status]?.map(t => t._id) || []}
                strategy={verticalListSortingStrategy}
              >
                <KanbanColumnItems status={status}>
                  {columns[status]?.map(task => (
                    <SortableTask key={task._id} task={task} />
                  ))}
                  {columns[status]?.length === 0 && (
                    <div className="flex items-center justify-center h-20 border border-dashed border-border/50 rounded-lg">
                      <p className="text-xs text-muted-foreground/50">Drop here</p>
                    </div>
                  )}
                </KanbanColumnItems>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          <TaskOverlay task={activeTask} />
        </DragOverlay>
      </DndContext>
    </div>
  );
}
