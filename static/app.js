const taskList = document.querySelector("#task-list");
const addForm = document.querySelector("#add-form");
const taskInput = document.querySelector("#task-input");
const statusMessage = document.querySelector("#status-message");
const toast = document.querySelector("#toast");

let todos = [];
let currentFilter = "all";
let toastTimeout;

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Something went wrong. Please try again.");
  }

  return response.status === 204 ? null : response.json();
}

function showError(message) {
  statusMessage.textContent = message;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function getVisibleTodos() {
  if (currentFilter === "active") return todos.filter((todo) => !todo.completed);
  if (currentFilter === "completed") return todos.filter((todo) => todo.completed);
  return todos;
}

function createTaskRow(todo) {
  const row = document.createElement("li");
  row.className = `task-row${todo.completed ? " is-complete" : ""}`;

  const toggle = document.createElement("button");
  toggle.className = `task-toggle${todo.completed ? " is-complete" : ""}`;
  toggle.type = "button";
  toggle.dataset.action = "toggle";
  toggle.dataset.id = todo.id;
  toggle.setAttribute("aria-label", `${todo.completed ? "Mark active" : "Complete"}: ${todo.title}`);
  toggle.setAttribute("aria-pressed", String(todo.completed));

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = todo.title;

  const remove = document.createElement("button");
  remove.className = "delete-button";
  remove.type = "button";
  remove.dataset.action = "delete";
  remove.dataset.id = todo.id;
  remove.setAttribute("aria-label", `Delete: ${todo.title}`);
  remove.title = "Delete task";

  row.append(toggle, title, remove);
  return row;
}

function render() {
  const completed = todos.filter((todo) => todo.completed).length;
  const total = todos.length;
  const active = total - completed;
  const visibleTodos = getVisibleTodos();

  taskList.replaceChildren(...visibleTodos.map(createTaskRow));
  document.querySelector("#task-total").textContent = `${total} ${total === 1 ? "task" : "tasks"}`;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#total-count").textContent = total;
  document.querySelector("#clear-completed").hidden = completed === 0;

  const progress = total ? Math.round((completed / total) * 100) : 0;
  const progressTrack = document.querySelector("#progress-track");
  progressTrack.setAttribute("aria-valuemax", total);
  progressTrack.setAttribute("aria-valuenow", completed);
  document.querySelector("#progress-fill").style.width = `${progress}%`;
  document.querySelector("#progress-note").textContent = total === 0
    ? "Add a task to get started."
    : active === 0
      ? "Everything on your list is done. Nice work."
      : `${active} ${active === 1 ? "task" : "tasks"} left to go.`;

  if (visibleTodos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    const heading = document.createElement("strong");
    const detail = document.createElement("span");
    if (total === 0) {
      heading.textContent = "A clear start.";
      detail.textContent = "Add the first thing on your mind.";
    } else if (currentFilter === "active") {
      heading.textContent = "Nothing left open.";
      detail.textContent = "Every task is complete.";
    } else {
      heading.textContent = "No completed tasks yet.";
      detail.textContent = "Completed tasks will show up here.";
    }
    empty.append(heading, detail);
    taskList.append(empty);
  }
}

async function loadTodos() {
  try {
    todos = await requestJson("/api/todos");
    render();
  } catch (error) {
    showError(error.message);
  }
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  try {
    const todo = await requestJson("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    todos.unshift(todo);
    currentFilter = "all";
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const selected = button.dataset.filter === currentFilter;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    taskInput.value = "";
    statusMessage.textContent = "";
    render();
    taskInput.focus();
  } catch (error) {
    showError(error.message);
  }
});

document.querySelector(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  currentFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((filterButton) => {
    const selected = filterButton === button;
    filterButton.classList.toggle("is-selected", selected);
    filterButton.setAttribute("aria-pressed", String(selected));
  });
  render();
});

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const todoId = Number(button.dataset.id);
  const todo = todos.find((item) => item.id === todoId);
  if (!todo) return;

  try {
    if (button.dataset.action === "toggle") {
      const updated = await requestJson(`/api/todos/${todoId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !todo.completed }),
      });
      todos = todos.map((item) => item.id === todoId ? updated : item);
      statusMessage.textContent = "";
      render();
    } else if (button.dataset.action === "delete") {
      await requestJson(`/api/todos/${todoId}`, { method: "DELETE" });
      todos = todos.filter((item) => item.id !== todoId);
      statusMessage.textContent = "";
      render();
      showToast("Task deleted");
    }
  } catch (error) {
    showError(error.message);
  }
});

document.querySelector("#clear-completed").addEventListener("click", async () => {
  try {
    await requestJson("/api/todos/completed", { method: "DELETE" });
    todos = todos.filter((todo) => !todo.completed);
    statusMessage.textContent = "";
    render();
    showToast("Completed tasks cleared");
  } catch (error) {
    showError(error.message);
  }
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
}).format(new Date());

loadTodos();