import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage.js';

const CATEGORIES = [
  { key: 'deals', label: 'Deals', icon: '🤝', accent: 'amber' },
  { key: 'marketing', label: 'Marketing', icon: '📣', accent: 'blue' },
  { key: 'admin', label: 'Admin', icon: '📋', accent: 'purple' },
  { key: 'investors', label: 'Investors', icon: '💼', accent: 'green' },
];

const ACCENT_CLASSES = {
  amber: { header: 'text-amber-400', check: 'accent-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', input: 'focus:border-amber-500' },
  blue:  { header: 'text-blue-400',  check: 'accent-blue-400',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   input: 'focus:border-blue-400' },
  purple:{ header: 'text-purple-400',check: 'accent-purple-400',badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',input: 'focus:border-purple-400' },
  green: { header: 'text-green-400', check: 'accent-green-400', badge: 'bg-green-500/10 text-green-400 border-green-500/20', input: 'focus:border-green-400' },
};

function TaskColumn({ category, tasks, onAdd, onToggle, onDelete, onClearCompleted }) {
  const [input, setInput] = useState('');
  const ac = ACCENT_CLASSES[category.accent];
  const pending = tasks.filter(t => !t.completed).length;
  const done = tasks.filter(t => t.completed).length;

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    onAdd(text);
    setInput('');
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{category.icon}</span>
          <h3 className={`font-semibold text-sm ${ac.header}`}>{category.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          {done > 0 && (
            <button
              onClick={onClearCompleted}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Clear done
            </button>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded border ${ac.badge}`}>
            {pending}/{tasks.length}
          </span>
        </div>
      </div>

      {/* Add input */}
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Add task…"
          className={`flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none ${ac.input} transition-colors`}
        />
        <button
          onClick={submit}
          className="px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-xs transition-colors shrink-0"
        >
          +
        </button>
      </div>

      {/* Task list */}
      <ul className="space-y-1.5 flex-1">
        {tasks.length === 0 && (
          <li className="text-xs text-zinc-600 py-2 text-center">Nothing here yet</li>
        )}
        {tasks.map(task => (
          <li key={task.id} className="flex items-start gap-2 group">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggle(task.id)}
              className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded ${ac.check} cursor-pointer`}
            />
            <span className={`text-xs flex-1 leading-snug ${task.completed ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
              {task.text}
            </span>
            <button
              onClick={() => onDelete(task.id)}
              className="text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-xs shrink-0"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WeeklyTasks() {
  const [tasksByCategory, setTasksByCategory] = useLocalStorage('alot-tasks', {
    deals: [], marketing: [], admin: [], investors: [],
  });

  const add = (cat, text) => {
    setTasksByCategory(prev => ({
      ...prev,
      [cat]: [...(prev[cat] || []), { id: crypto.randomUUID(), text, completed: false }],
    }));
  };

  const toggle = (cat, id) => {
    setTasksByCategory(prev => ({
      ...prev,
      [cat]: prev[cat].map(t => t.id === id ? { ...t, completed: !t.completed } : t),
    }));
  };

  const del = (cat, id) => {
    setTasksByCategory(prev => ({
      ...prev,
      [cat]: prev[cat].filter(t => t.id !== id),
    }));
  };

  const clearCompleted = (cat) => {
    setTasksByCategory(prev => ({
      ...prev,
      [cat]: prev[cat].filter(t => !t.completed),
    }));
  };

  const totalPending = CATEGORIES.reduce((sum, c) => sum + (tasksByCategory[c.key] || []).filter(t => !t.completed).length, 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white tracking-tight">Weekly Tasks</h2>
        {totalPending > 0 && (
          <span className="text-xs text-zinc-500">{totalPending} open</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CATEGORIES.map(cat => (
          <TaskColumn
            key={cat.key}
            category={cat}
            tasks={tasksByCategory[cat.key] || []}
            onAdd={text => add(cat.key, text)}
            onToggle={id => toggle(cat.key, id)}
            onDelete={id => del(cat.key, id)}
            onClearCompleted={() => clearCompleted(cat.key)}
          />
        ))}
      </div>
    </section>
  );
}
