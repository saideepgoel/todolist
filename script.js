const motivationalMsgs = [
  "Keep pushing, success is near! 🚀",
  "You're doing amazing! 💪",
  "One task at a time, you got this! ✨",
  "Every tick is progress! ✅"
];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const subjectsList = ["physics","chemistry","maths","others"];

  // Load tasks
  subjectsList.forEach(subject => loadTasks(subject));

  // Load subject order
  loadSubjectOrder();

  // Enter key listener
  subjectsList.forEach(subject => {
    const input = document.getElementById(`${subject}-input`);
    input.addEventListener("keypress", e => {
      if(e.key === "Enter") addTask(subject);
    });
  });

  // Drag-and-drop
  initDragDrop();

  // Initial motivation
  updateMotivation();
});

// Add task
function addTask(subject) {
  const input = document.getElementById(`${subject}-input`);
  const taskText = input.value.trim();
  if (!taskText) return;

  const ul = document.getElementById(`${subject}-list`);
  const li = createTaskElement(taskText, subject);
  ul.appendChild(li);

  input.value = "";
  saveTasks(subject);
  updateMotivation();
}

// Create task element
function createTaskElement(taskText, subject) {
  const li = document.createElement("li");
  li.style.position = "relative";

  const span = document.createElement("span");
  span.textContent = taskText;
  span.className = "task-text";

  const completeBtn = document.createElement("button");
  completeBtn.innerHTML = "✔";
  completeBtn.className = "complete-btn";

  completeBtn.addEventListener("click", () => {
    completeBtn.classList.add("active");
    createConfetti(li);

    // Smooth deletion
    li.classList.add("removing");
    setTimeout(() => {
      li.remove();
      saveTasks(subject);
      updateMotivation();
    }, 300);
  });

  li.appendChild(span);
  li.appendChild(completeBtn);
  return li;
}

// Confetti
function createConfetti(parent) {
  const colors = ["#FFD700","#FF3B30","#4CAF50","#00BFFF","#FF69B4"];
  for(let i=0;i<8;i++){
    const confetti = document.createElement("div");
    confetti.className="confetti";
    confetti.style.backgroundColor=colors[Math.floor(Math.random()*colors.length)];
    confetti.style.left=Math.random()*parent.offsetWidth+"px";
    confetti.style.top=Math.random()*parent.offsetHeight+"px";
    confetti.style.transform=`rotate(${Math.random()*360}deg)`;
    parent.appendChild(confetti);
    setTimeout(()=>confetti.remove(),1000);
  }
}

// Save/load tasks
function saveTasks(subject) {
  const ul = document.getElementById(`${subject}-list`);
  const tasks = Array.from(ul.querySelectorAll("li")).map(li => ({
    text: li.querySelector(".task-text").textContent
  }));
  localStorage.setItem(subject, JSON.stringify(tasks));
}

function loadTasks(subject) {
  const ul = document.getElementById(`${subject}-list`);
  const tasks = JSON.parse(localStorage.getItem(subject)) || [];
  tasks.forEach(t => ul.appendChild(createTaskElement(t.text, subject)));
}

// Motivational messages
function updateMotivation() {
  const msgEl = document.getElementById("motivation");
  const subjects = ["physics","chemistry","maths","others"];
  let hasTasks = subjects.some(sub => document.getElementById(`${sub}-list`).children.length > 0);

  if(hasTasks) {
    const msg = motivationalMsgs[Math.floor(Math.random() * motivationalMsgs.length)];
    msgEl.textContent = msg;
  } else {
    msgEl.textContent = "All done! Time for a break! 🎉";
  }
}

// Drag-and-drop subjects
function initDragDrop() {
  const subjects = document.querySelectorAll(".subject");
  let dragSrcEl = null;

  subjects.forEach(sub => {
    sub.setAttribute("draggable", true);

    sub.addEventListener("dragstart", function(e) {
      dragSrcEl = this;
      this.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    sub.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    sub.addEventListener("drop", function(e) {
      e.preventDefault();
      if(dragSrcEl !== this) {
        const container = this.parentNode;
        const nodes = Array.from(container.children);
        const srcIndex = nodes.indexOf(dragSrcEl);
        const targetIndex = nodes.indexOf(this);

        if(srcIndex < targetIndex) container.insertBefore(dragSrcEl, this.nextSibling);
        else container.insertBefore(dragSrcEl, this);

        saveSubjectOrder();
      }
    });

    sub.addEventListener("dragend", function() {
      subjects.forEach(s => s.classList.remove("dragging"));
    });
  });
}

// Save/load subject order
function saveSubjectOrder() {
  const order = Array.from(document.querySelectorAll(".grid-container .subject"))
                    .map(sub => sub.id);
  localStorage.setItem("subjectOrder", JSON.stringify(order));
}

function loadSubjectOrder() {
  const order = JSON.parse(localStorage.getItem("subjectOrder")) || [];
  const container = document.querySelector(".grid-container");
  order.forEach(id => {
    const el = document.getElementById(id);
    if(el) container.appendChild(el);
  });
}
