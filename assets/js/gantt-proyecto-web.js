const STORAGE_KEY = "lr_suite_gantt_proyecto_web_v1";

const defaultBoard = {
  columns: [
    { id: "week-1", label: "Semana 1" },
    { id: "week-2", label: "Semana 2" },
    { id: "week-3", label: "Semana 3" },
    { id: "week-4", label: "Semana 4" },
  ],
  tasks: [
    {
      id: "task-1",
      phase: "Paso 1",
      description: "Mapeo de contenidos y productos",
      owner: "Lima Retail / Cliente",
      cells: { "week-1": true },
    },
    {
      id: "task-2",
      phase: "Paso 2",
      description: "Seleccion de templates",
      owner: "Lima Retail / Melissa",
      cells: { "week-1": true, "week-2": true },
    },
    {
      id: "task-3",
      phase: "Paso 3",
      description: "Validacion de funcionalidades",
      owner: "Lima Retail",
      cells: { "week-2": true },
    },
    {
      id: "task-4",
      phase: "Paso 4",
      description: "Validacion de disenos por parte de Podium",
      owner: "Podium / Lima Retail",
      cells: { "week-2": true, "week-3": true },
    },
    {
      id: "task-5",
      phase: "Paso 5",
      description: "Implementacion",
      owner: "Lima Retail",
      cells: { "week-3": true, "week-4": true },
    },
    {
      id: "task-6",
      phase: "Paso 6",
      description: "Adaptacion movil",
      owner: "Lima Retail",
      cells: { "week-4": true },
    },
    {
      id: "task-7",
      phase: "Paso 7",
      description: "Pruebas",
      owner: "Lima Retail / Cliente",
      cells: { "week-4": true },
    },
  ],
};

const ganttHead = document.querySelector("#gantt-head");
const ganttBody = document.querySelector("#gantt-body");
const metricsGrid = document.querySelector("#metrics-grid");
const searchInput = document.querySelector("#task-search");
const densityButton = document.querySelector("#toggle-density");
const printButton = document.querySelector("#print-view");
const addRowButton = document.querySelector("#add-row");
const addColumnButton = document.querySelector("#add-column");
const resetBoardButton = document.querySelector("#reset-board");
const saveStatus = document.querySelector("#save-status");
const segments = [...document.querySelectorAll(".segment")];

let activeView = "todos";
let board = loadBoard();
let saveTimer;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadBoard() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return clone(defaultBoard);
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.tasks)) {
      return clone(defaultBoard);
    }
    return {
      columns: parsed.columns.map((column, index) => ({
        id: column.id || `week-${index + 1}`,
        label: column.label || `Semana ${index + 1}`,
      })),
      tasks: parsed.tasks.map((task, index) => ({
        id: task.id || `task-${Date.now()}-${index}`,
        phase: task.phase || `Paso ${index + 1}`,
        description: task.description || "",
        owner: task.owner || "",
        cells: task.cells || {},
      })),
    };
  } catch (error) {
    return clone(defaultBoard);
  }
}

function saveBoard() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  saveStatus.textContent = "Guardando...";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveStatus.textContent = "Guardado local";
  }, 450);
}

function normalise(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function matchesView(task) {
  if (activeView === "todos") return true;
  const viewKey = activeView.replace(/-/g, " ");
  return normalise(task.owner).includes(viewKey);
}

function matchesSearch(task) {
  const query = normalise(searchInput.value.trim());
  if (!query) return true;
  return normalise(`${task.phase} ${task.description} ${task.owner}`).includes(query);
}

function getTaskActiveColumns(task) {
  return board.columns.filter((column) => Boolean(task.cells[column.id]));
}

function renderMetrics() {
  const uniqueOwners = new Set(
    board.tasks
      .flatMap((task) => task.owner.split("/").map((owner) => owner.trim()))
      .filter(Boolean)
  );
  const lastColumn = board.columns[board.columns.length - 1];
  const lastColumnTasks = lastColumn
    ? board.tasks.filter((task) => Boolean(task.cells[lastColumn.id])).length
    : 0;
  const metricData = [
    ["Fases", board.tasks.length],
    ["Columnas", board.columns.length],
    ["Responsables", uniqueOwners.size],
    [lastColumn ? `Cierre ${lastColumn.label}` : "Cierre", lastColumnTasks],
  ];

  metricsGrid.innerHTML = metricData
    .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderHead() {
  const timelineHeaders = board.columns
    .map(
      (column) => `
        <th scope="col" class="timeline-column">
          <input class="header-input" value="${escapeHtml(column.label)}" data-column-id="${column.id}" aria-label="Nombre de columna ${escapeHtml(column.label)}">
        </th>
      `
    )
    .join("");

  ganttHead.innerHTML = `
    <tr>
      <th scope="col">Fase</th>
      <th scope="col">Descripcion del paso / entregable</th>
      <th scope="col">Responsable</th>
      ${timelineHeaders}
      <th scope="col" class="actions-column">Accion</th>
    </tr>
  `;
}

function renderTable() {
  renderHead();
  ganttBody.innerHTML = board.tasks
    .map((task) => {
      const isHidden = !matchesView(task) || !matchesSearch(task);
      const activeCount = getTaskActiveColumns(task).length;
      const cells = board.columns
        .map((column) => {
          const active = Boolean(task.cells[column.id]);
          const overlap = active && activeCount > 1;
          const classes = ["week-cell", active ? "is-active" : "", overlap ? "is-overlap" : ""]
            .filter(Boolean)
            .join(" ");
          return `
            <td class="${classes}">
              <button class="cell-toggle" type="button" data-task-id="${task.id}" data-column-id="${column.id}" aria-pressed="${active}">
                ${active ? "x" : ""}
              </button>
            </td>
          `;
        })
        .join("");

      return `
        <tr class="${isHidden ? "hidden" : ""}" data-task-id="${task.id}">
          <td class="phase-cell">
            <input class="table-input short" value="${escapeHtml(task.phase)}" data-field="phase" data-task-id="${task.id}" aria-label="Fase">
          </td>
          <td>
            <input class="table-input" value="${escapeHtml(task.description)}" data-field="description" data-task-id="${task.id}" aria-label="Descripcion del entregable">
          </td>
          <td class="owner-cell">
            <input class="table-input" value="${escapeHtml(task.owner)}" data-field="owner" data-task-id="${task.id}" aria-label="Responsable">
          </td>
          ${cells}
          <td class="row-actions">
            <button class="row-delete" type="button" data-task-id="${task.id}" title="Eliminar fila">Borrar</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  renderMetrics();
  renderTable();
}

function findTask(taskId) {
  return board.tasks.find((task) => task.id === taskId);
}

function updateTaskField(taskId, field, value) {
  const task = findTask(taskId);
  if (!task) return;
  task[field] = value;
  saveBoard();
  renderMetrics();
}

function updateColumnLabel(columnId, value) {
  const column = board.columns.find((item) => item.id === columnId);
  if (!column) return;
  column.label = value || "Nueva columna";
  saveBoard();
  renderMetrics();
}

function toggleCell(taskId, columnId) {
  const task = findTask(taskId);
  if (!task) return;
  task.cells[columnId] = !task.cells[columnId];
  if (!task.cells[columnId]) delete task.cells[columnId];
  saveBoard();
  renderAll();
}

function addRow() {
  const nextNumber = board.tasks.length + 1;
  board.tasks.push({
    id: `task-${Date.now()}`,
    phase: `Paso ${nextNumber}`,
    description: "Nuevo entregable",
    owner: "Lima Retail",
    cells: {},
  });
  saveBoard();
  renderAll();
}

function addColumn() {
  const nextNumber = board.columns.length + 1;
  board.columns.push({
    id: `column-${Date.now()}`,
    label: `Semana ${nextNumber}`,
  });
  saveBoard();
  renderAll();
}

function deleteRow(taskId) {
  if (board.tasks.length <= 1) return;
  board.tasks = board.tasks.filter((task) => task.id !== taskId);
  saveBoard();
  renderAll();
}

function resetBoard() {
  board = clone(defaultBoard);
  saveBoard();
  searchInput.value = "";
  activeView = "todos";
  updateSegments("todos");
  renderAll();
}

function updateSegments(nextView) {
  activeView = nextView;
  segments.forEach((segment) => {
    const selected = segment.dataset.view === activeView;
    segment.classList.toggle("active", selected);
    segment.setAttribute("aria-selected", String(selected));
  });
  renderTable();
}

segments.forEach((segment) => {
  segment.addEventListener("click", () => updateSegments(segment.dataset.view));
});

searchInput.addEventListener("input", renderTable);

ganttHead.addEventListener("input", (event) => {
  const input = event.target.closest(".header-input");
  if (!input) return;
  updateColumnLabel(input.dataset.columnId, input.value.trim());
});

ganttBody.addEventListener("input", (event) => {
  const input = event.target.closest(".table-input");
  if (!input) return;
  updateTaskField(input.dataset.taskId, input.dataset.field, input.value);
});

ganttBody.addEventListener("click", (event) => {
  const toggle = event.target.closest(".cell-toggle");
  if (toggle) {
    toggleCell(toggle.dataset.taskId, toggle.dataset.columnId);
    return;
  }

  const deleteButton = event.target.closest(".row-delete");
  if (deleteButton) deleteRow(deleteButton.dataset.taskId);
});

addRowButton.addEventListener("click", addRow);
addColumnButton.addEventListener("click", addColumn);
resetBoardButton.addEventListener("click", resetBoard);

densityButton.addEventListener("click", () => {
  const pressed = densityButton.getAttribute("aria-pressed") === "true";
  densityButton.setAttribute("aria-pressed", String(!pressed));
  document.body.classList.toggle("compact", !pressed);
});

printButton.addEventListener("click", () => window.print());

renderAll();
