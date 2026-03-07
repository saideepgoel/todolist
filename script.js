const STORAGE_KEY = "jeeStudyTasks";

const form = document.getElementById("task-form");
const subjectSelect = document.getElementById("subject");
const taskInput = document.getElementById("task");
const deadlineInput = document.getElementById("deadline");
const template = document.getElementById("task-template");

const totalTasksEl = document.getElementById("total-tasks");
const completedTasksEl = document.getElementById("completed-tasks");
const pendingTasksEl = document.getElementById("pending-tasks");

let tasks = loadTasks();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const subject = subjectSelect.value;
  const text = taskInput.value.trim();
  const deadline = deadlineInput.value;

  if (!subject || !text) {
    return;
  }

  tasks.push({
    id: crypto.randomUUID(),
    subject,
    text,
    deadline,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTasks();
  render();
  form.reset();
});

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  ["Physics", "Chemistry", "Mathematics"].forEach((subject) => {
    const list = document.getElementById(subject);
    list.textContent = "";

    tasks
      .filter((task) => task.subject === subject)
      .forEach((task) => list.appendChild(renderTask(task)));

    if (!list.children.length) {
      const empty = document.createElement("li");
      empty.className = "task-meta";
      empty.textContent = "No tasks added yet.";
      list.appendChild(empty);
    }
  });

  updateStats();
}

function renderTask(task) {
  const node = template.content.firstElementChild.cloneNode(true);
  const checkbox = node.querySelector(".task-check");
  const text = node.querySelector(".task-text");
  const meta = node.querySelector(".task-meta");
  const deleteBtn = node.querySelector(".delete-btn");

  checkbox.checked = task.completed;
  text.textContent = task.text;

  const deadlineText = task.deadline ? `Deadline: ${task.deadline}` : "No deadline";
  meta.textContent = `${deadlineText}`;

  if (task.completed) {
    node.classList.add("completed");
  }

  checkbox.addEventListener("change", () => {
    tasks = tasks.map((item) =>
      item.id === task.id ? { ...item, completed: checkbox.checked } : item,
    );
    saveTasks();
    render();
  });

  deleteBtn.addEventListener("click", () => {
    tasks = tasks.filter((item) => item.id !== task.id);
    saveTasks();
    render();
  });

  return node;
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;

  totalTasksEl.textContent = String(total);
  completedTasksEl.textContent = String(completed);
  pendingTasksEl.textContent = String(pending);
}
