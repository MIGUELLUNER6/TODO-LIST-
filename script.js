/* TaskFlow — task management, filtering, editing and browser storage */
const STORAGE_KEY = "taskflow_tasks_v1";

const elements = {
    taskForm: document.getElementById("taskForm"),
    taskTitle: document.getElementById("taskTitle"),
    taskDescription: document.getElementById("taskDescription"),
    taskPriority: document.getElementById("taskPriority"),
    taskDueDate: document.getElementById("taskDueDate"),
    taskList: document.getElementById("taskList"),
    emptyState: document.getElementById("emptyState"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    listHeading: document.getElementById("listHeading"),
    formTitle: document.getElementById("formTitle"),
    saveButton: document.getElementById("saveButton")
};

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

function loadTasks() {
    try {
        const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(savedTasks) ? savedTasks : [];
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${task.dueDate}T00:00:00`) < today;
}

function openForm(task = null) {
    editingTaskId = task ? task.id : null;
    elements.taskForm.classList.remove("hidden");
    elements.formTitle.textContent = task ? "Edit task" : "Create a task";
    elements.saveButton.textContent = task ? "Update task" : "Save task";
    elements.taskTitle.value = task ? task.title : "";
    elements.taskDescription.value = task ? task.description : "";
    elements.taskPriority.value = task ? task.priority : "medium";
    elements.taskDueDate.value = task ? task.dueDate : "";
    elements.taskTitle.focus();
    elements.taskForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
    elements.taskForm.classList.add("hidden");
    elements.taskForm.reset();
    editingTaskId = null;
}

function saveTask(event) {
    event.preventDefault();

    const title = elements.taskTitle.value.trim();
    if (!title) {
        elements.taskTitle.focus();
        return;
    }

    const taskData = {
        title,
        description: elements.taskDescription.value.trim(),
        priority: elements.taskPriority.value,
        dueDate: elements.taskDueDate.value
    };

    if (editingTaskId) {
        tasks = tasks.map(task =>
            task.id === editingTaskId ? { ...task, ...taskData } : task
        );
    } else {
        tasks.unshift({
            id: createId(),
            ...taskData,
            completed: false,
            createdAt: new Date().toISOString()
        });
    }

    saveTasks();
    closeForm();
    render();
}

function toggleTask(taskId) {
    tasks = tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    render();
}

function deleteTask(taskId) {
    const task = tasks.find(item => item.id === taskId);
    if (!task || !window.confirm(`Delete "${task.title}"?`)) return;

    tasks = tasks.filter(item => item.id !== taskId);
    saveTasks();
    render();
}

function clearCompleted() {
    const completedCount = tasks.filter(task => task.completed).length;
    if (!completedCount) return;
    if (!window.confirm(`Clear ${completedCount} completed task(s)?`)) return;

    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    render();
}

function getVisibleTasks() {
    const query = elements.searchInput.value.trim().toLowerCase();
    let visibleTasks = tasks.filter(task => {
        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "active" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        const matchesSearch =
            task.title.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query);

        return matchesFilter && matchesSearch;
    });

    const sortMode = elements.sortSelect.value;

    if (sortMode === "due") {
        visibleTasks.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    } else if (sortMode === "priority") {
        const priorityRank = { high: 0, medium: 1, low: 2 };
        visibleTasks.sort((a, b) =>
            priorityRank[a.priority] - priorityRank[b.priority]
        );
    } else {
        visibleTasks.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    return visibleTasks;
}

function createTaskElement(task) {
    const article = document.createElement("article");
    article.className = `task-card${task.completed ? " completed" : ""}`;

    const checkButton = document.createElement("button");
    checkButton.className = "check-button";
    checkButton.type = "button";
    checkButton.textContent = task.completed ? "✓" : "";
    checkButton.setAttribute(
        "aria-label",
        task.completed ? "Mark as incomplete" : "Mark as complete"
    );
    checkButton.addEventListener("click", () => toggleTask(task.id));

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;
    content.appendChild(title);

    if (task.description) {
        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description;
        content.appendChild(description);
    }

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const priority = document.createElement("span");
    priority.className = `pill ${task.priority}`;
    priority.textContent = `${task.priority} priority`;
    meta.appendChild(priority);

    if (task.dueDate) {
        const dueDate = document.createElement("span");
        dueDate.className = `pill${isOverdue(task) ? " overdue" : ""}`;
        dueDate.textContent = `${isOverdue(task) ? "Overdue · " : "Due · "}${formatDate(task.dueDate)}`;
        meta.appendChild(dueDate);
    }

    content.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.className = "task-action";
    editButton.type = "button";
    editButton.textContent = "✎";
    editButton.title = "Edit task";
    editButton.setAttribute("aria-label", "Edit task");
    editButton.addEventListener("click", () => openForm(task));

    const deleteButton = document.createElement("button");
    deleteButton.className = "task-action";
    deleteButton.type = "button";
    deleteButton.textContent = "⌫";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", "Delete task");
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    article.append(checkButton, content, actions);

    return article;
}

function updateCounters() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;

    document.getElementById("allCount").textContent = total;
    document.getElementById("activeCount").textContent = active;
    document.getElementById("completedCount").textContent = completed;

    document.getElementById("totalSummary").textContent = total;
    document.getElementById("activeSummary").textContent = active;
    document.getElementById("completedSummary").textContent = completed;

    document.getElementById("footerCount").textContent =
        `${getVisibleTasks().length} task(s) shown`;
}

function render() {
    const visibleTasks = getVisibleTasks();
    elements.taskList.replaceChildren();

    visibleTasks.forEach(task => {
        elements.taskList.appendChild(createTaskElement(task));
    });

    elements.emptyState.classList.toggle("visible", visibleTasks.length === 0);
    elements.taskList.style.display = visibleTasks.length ? "grid" : "none";

    const headings = {
        all: "All tasks",
        active: "In progress",
        completed: "Completed"
    };
    elements.listHeading.textContent = headings[currentFilter];

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.filter === currentFilter);
    });

    updateCounters();
}

document.getElementById("openFormButton").addEventListener("click", () => openForm());
document.getElementById("emptyAddButton").addEventListener("click", () => openForm());
document.getElementById("closeFormButton").addEventListener("click", closeForm);
document.getElementById("cancelButton").addEventListener("click", closeForm);
document.getElementById("taskForm").addEventListener("submit", saveTask);
document.getElementById("clearCompletedButton").addEventListener("click", clearCompleted);
elements.searchInput.addEventListener("input", render);
elements.sortSelect.addEventListener("change", render);

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        render();
    });
});

document.getElementById("dateDisplay").textContent =
    new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

document.getElementById("todayLabel").textContent =
    new Date().toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
    }).toUpperCase();

render();
