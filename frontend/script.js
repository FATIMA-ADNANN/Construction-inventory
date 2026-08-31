const API_URL =
    "http://localhost:5000/api";

const token =
    localStorage.getItem("token");

const user =
    JSON.parse(
        localStorage.getItem("user") ||
        "null"
    );

if (!token || !user) {

    window.location.href =
        "login.html";
}


// ================= DATA =================

let records = [];

let projects = [];

let checkouts = [];

let selectedCheckoutRecord = null;

let editingRecordId = null;

let activeTab = "ledger";

let dashProject = "";

const currentRole =
    user?.role || "viewer";

const canEdit = [
    "admin",
    "manager"
].includes(currentRole);

const canCheckout = [
    "admin",
    "manager",
    "engineer"
].includes(currentRole);

// ================= PERMISSIONS =================

function getRole() {

    return user?.role || "viewer";
}


function canManageInventory() {

    return [
        "admin",
        "manager"
    ].includes(getRole());

}


function canDeleteInventory() {

    return getRole() === "admin";
}




// ================= AUTH =================

function authHeaders(json = false) {

    const headers = {

        Authorization:
            `Bearer ${localStorage.getItem("token")}`
    };

    if (json) {

        headers["Content-Type"] =
            "application/json";
    }

    return headers;
}


// ================= HELPERS =================

function money(number) {

    return (
        "₨" +
        Math.round(
            Number(number) || 0
        ).toLocaleString("en-PK")
    );
}


function num(number) {

    return (
        Number(number) || 0
    ).toLocaleString("en-PK");
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ================= API RESPONSE =================

async function handleApiResponse(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        const data =
            await response.json()
                .catch(() => null);

        if (
            response.status === 401
        ) {

            localStorage.clear();

            window.location.href =
                "login.html";
        }

        throw new Error(
            data?.message ||
            "Access denied"
        );
    }

    return response;
}


// ================= LOAD PROJECTS =================

async function loadProjects() {

    const response =
        await fetch(
            `${API_URL}/projects`,
            {
                headers:
                    authHeaders()
            }
        );

    await handleApiResponse(
        response
    );

    if (!response.ok) {

        throw new Error(
            "Failed to load projects"
        );
    }

    const data =
        await response.json();

    projects = data;
}

function populateInventoryProjectDropdown() {
    const select = document.getElementById("in-project");

    if (!select) {
        console.error("in-project dropdown not found");
        return;
    }

    select.innerHTML = `
        <option value="">Select Project</option>
    `;

    projects.forEach(project => {
        const option = document.createElement("option");

        option.value = project.name;
        option.textContent = project.name;

        select.appendChild(option);
    });
}

// ================= LOAD INVENTORY =================

async function loadRecords() {

    const response =
        await fetch(
            `${API_URL}/inventory`,
            {
                headers:
                    authHeaders()
            }
        );

    await handleApiResponse(
        response
    );

    if (!response.ok) {

        throw new Error(
            "Failed to load inventory"
        );
    }

    const data =
        await response.json();

    records =
        data.map(record => ({
            ...record,

            rate:
                Number(record.rate) || 0,

            demand:
                Number(record.demand) || 0,

            received:
                Number(record.received) || 0,

            checked_out:
                Number(record.checked_out) || 0
        }));
}


// ================= LOAD CHECKOUTS =================

async function loadCheckouts() {

    const response =
        await fetch(
            `${API_URL}/checkouts`,
            {
                headers:
                    authHeaders()
            }
        );

    await handleApiResponse(
        response
    );

    if (!response.ok) {

        throw new Error(
            "Failed to load checkouts"
        );
    }

    checkouts =
        await response.json();
}


// ================= AVAILABLE =================

function availableQuantity(record) {

    return Math.max(
        0,

        Number(record.received) -
        Number(record.checked_out)
    );
}


// ================= PROJECT OPTIONS =================

function uniqueProjects() {

    return [
        ...new Set(
            projects.map(
                project =>
                    project.name
            )
        )
    ]
        .filter(Boolean)
        .sort();
}


function renderProjectFilterOptions() {

    const select =
        document.getElementById(
            "f-project"
        );

    if (!select) return;

    const current =
        select.value;

    select.innerHTML =
        `<option value="">
            All Projects
        </option>` +

        uniqueProjects()
            .map(
                project =>
                    `<option value="${escapeHtml(project)}">
                        ${escapeHtml(project)}
                    </option>`
            )
            .join("");

    select.value =
        current;
}


// ================= FILTER =================

function filteredLedgerRecords() {

    const search =
        document
            .getElementById("f-search")
            ?.value
            .toLowerCase() || "";

    const project =
        document
            .getElementById("f-project")
            ?.value || "";

    return records.filter(
        record => {

            const text = [
                record.project,
                record.item,
                record.grade,
                record.po_reference,
                record.unit
            ]
                .join(" ")
                .toLowerCase();

            return (
                (!project ||
                    record.project === project
                ) &&

                (!search ||
                    text.includes(search)
                )
            );
        }
    );
}


// ================= RENDER LEDGER =================

function renderLedger() {

    renderProjectFilterOptions();

    const rows = filteredLedgerRecords();

    const body =
        document.getElementById("ledgerBody");

    const emptyState =
        document.getElementById("emptyState");

    if (!body) return;

    if (emptyState) {

        emptyState.style.display =
            rows.length
                ? "none"
                : "block";

    }


    body.innerHTML =
        rows.map(record => {

            const available =
                availableQuantity(record);

            const cost =
                record.rate *
                record.received;


            return `

                <tr data-id="${record.id}">

                   <td
                        class="${canEdit ? "editable" : ""}"
                        data-field="project"
                    >
                        ${escapeHtml(record.project)}
                    </td>

                    <td
                        class="${canEdit ? "editable" : ""}"
                        data-field="item"
                    >
                        ${escapeHtml(record.item)}
                    </td>


                    <td
                        class="${canEdit ? "editable" : ""}"
                        data-field="grade"
                    >
                        ${escapeHtml(record.grade)}
                    </td>


                    <td
                        class="${canEdit ? "editable" : ""}"
                        data-field="po_reference"
                    >
                        ${escapeHtml(record.po_reference)}
                    </td>


                    <td
                        class="${canEdit ? "editable" : ""}"
                        data-field="unit"
                    >
                        ${escapeHtml(record.unit)}
                    </td>


                    <td
                        class="num ${canEdit ? "editable" : ""}"
                        data-field="rate"
                    >
                        ${canEdit
                            ? `<input
                                type="number"
                                value="${record.rate}"
                                data-field="rate"
                            >`
                            : money(record.rate)
                        }
                    </td>


                    <td
                        class="num ${canEdit ? "editable" : ""}"
                        data-field="demand"
                    >
                        ${canEdit
                            ? `<input
                                type="number"
                                value="${record.demand}"
                                data-field="demand"
                            >`
                            : num(record.demand)
                        }
                    </td>


                    <td
                        class="num ${canEdit ? "editable" : ""}"
                        data-field="received"
                    >
                        ${canEdit
                            ? `<input
                                type="number"
                                value="${record.received}"
                                data-field="received"
                            >`
                            : num(record.received)
                        }
                    </td>


                    <td class="num available-qty">

                        ${num(available)}

                    </td>


                    <td class="num">

                        ${money(cost)}

                    </td>


                    <td>

                        ${
                            record.updated_at
                                ? new Date(
                                    record.updated_at
                                ).toLocaleDateString()
                                : ""
                        }

                    </td>


                    <td
                        class="${canEdit ? "editable" : ""}"
                        data-field="remarks"
                    >

                        ${escapeHtml(record.remarks)}

                    </td>


                   <td>
                        <div class="rowbtns">

                            ${
                                canEdit
                                    ? `
                                        <button
                                            type="button"
                                            class="edit"
                                            data-edit="${record.id}"
                                        >
                                            Edit
                                        </button>
                                    `
                                    : ""
                            }

                            ${
                                canCheckout
                                    ? `
                                        <button
                                            type="button"
                                            class="checkout-btn"
                                            data-checkout="${record.id}"
                                        >
                                            Checkout
                                        </button>
                                    `
                                    : ""
                            }

                            ${
                                canDeleteInventory()
                                    ? `
                                        <button
                                            type="button"
                                            class="del"
                                            data-delete="${record.id}"
                                        >
                                            Delete
                                        </button>
                                    `
                                    : ""
                            }

                        </div>
                    </td>

                </tr>

            `;

        }).join("");


    const recordCount =
        document.getElementById(
            "recordCountStamp"
        );


    if (recordCount) {

        recordCount.textContent =
            `${records.length} ITEMS ON RECORD`;

    }

}

// ================= INVENTORY FORM =================

function openInventoryForm(id = null) {

    if (!canManageInventory()) {
        alert(
            "You do not have permission to manage inventory."
        );
        return;
    }

    // If checkout panel is open, close it
    closeCheckout();

    editingRecordId = id;

    const panel =
        document.getElementById("inventoryPanel");

    if (!panel) {
        console.error("inventoryPanel not found");
        return;
    }

    // Load project dropdown
    populateInventoryProjectDropdown();

    // Find record when editing
    const record = id
        ? records.find(
            item =>
                String(item.id) === String(id)
        )
        : null;

    // Change title
    const title =
        document.getElementById(
            "inventoryFormTitle"
        );

    if (title) {
        title.textContent = record
            ? "Edit Inventory Item"
            : "Add Inventory Item";
    }

    // Fill form
    document.getElementById("in-project").value =
        record?.project || "";

    document.getElementById("in-item").value =
        record?.item || "";

    document.getElementById("in-grade").value =
        record?.grade || "";

    document.getElementById("in-po").value =
        record?.po_reference || "";

    document.getElementById("in-unit").value =
        record?.unit || "";

    document.getElementById("in-rate").value =
        record?.rate || 0;

    document.getElementById("in-demand").value =
        record?.demand || 0;

    document.getElementById("in-received").value =
        record?.received || 0;

    document.getElementById("in-remarks").value =
        record?.remarks || "";

    // Show inventory panel
    panel.style.display = "block";
}

function closeInventoryForm() {

    editingRecordId = null;

    const panel =
        document.getElementById(
            "inventoryPanel"
        );

    if (panel) {
        panel.style.display = "none";
    }
}


async function saveInventory() {

    if (!canManageInventory()) {

        alert(
            "You do not have permission to manage inventory."
        );

        return;
    }

    const payload = {

        project:
            document
                .getElementById("in-project")
                .value
                .trim(),

        item:
            document
                .getElementById("in-item")
                .value
                .trim(),

        grade:
            document
                .getElementById("in-grade")
                .value
                .trim(),

        po_reference:
            document
                .getElementById("in-po")
                .value
                .trim(),

        unit:
            document
                .getElementById("in-unit")
                .value
                .trim(),

        rate:
            Number(
                document
                    .getElementById("in-rate")
                    .value
            ) || 0,

        demand:
            Number(
                document
                    .getElementById("in-demand")
                    .value
            ) || 0,

        received:
            Number(
                document
                    .getElementById("in-received")
                    .value
            ) || 0,

        remarks:
            document
                .getElementById("in-remarks")
                .value
                .trim()
    };

    if (!payload.project) {

        alert("Please select a project.");

        return;
    }

    if (!payload.item) {

        alert("Item name is required.");

        return;
    }

    const wasEditing =
        editingRecordId !== null;

    const url =
        wasEditing
            ? `${API_URL}/inventory/${editingRecordId}`
            : `${API_URL}/inventory`;

    const method =
        wasEditing
            ? "PUT"
            : "POST";

    try {

        const response =
            await fetch(
                url,
                {
                    method,
                    headers:
                        authHeaders(true),
                    body:
                        JSON.stringify(payload)
                }
            );

        const data =
            await response
                .json()
                .catch(() => ({}));

        if (!response.ok) {

            alert(
                data.message ||
                "Failed to save inventory."
            );

            return;
        }

        closeInventoryForm();

        await loadRecords();

        renderAll();

        alert(
            wasEditing
                ? "Inventory updated successfully."
                : "Inventory added successfully."
        );

    } catch (error) {

        console.error(
            "Save inventory error:",
            error
        );

        alert(
            "Unable to connect to backend."
        );
    }
}


// ================= DELETE =================

async function deleteInventory(id) {

    if (!canDeleteInventory()) {

        alert(
            "Only administrators can delete inventory."
        );

        return;
    }

    const confirmed =
        confirm(
            "Are you sure you want to delete this inventory item?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/inventory/${id}`,
                {
                    method: "DELETE",
                    headers:
                        authHeaders()
                }
            );

        const data =
            await response
                .json()
                .catch(() => ({}));

        if (!response.ok) {

            alert(
                data.message ||
                "Failed to delete item."
            );

            return;
        }

        await loadRecords();

        renderAll();

        alert(
            "Inventory item deleted successfully."
        );

    } catch (error) {

        console.error(
            "Delete error:",
            error
        );

        alert(
            "Unable to connect to backend."
        );
    }
}


// ================= CHECKOUT =================
function openCheckout(id) {
    const record = records.find(
        record => String(record.id) === String(id)
    );

    if (!record) {
        return;
    }

    const available = availableQuantity(record);

    if (available <= 0) {
        alert("No quantity is available for checkout.");
        return;
    }

    selectedCheckoutRecord = record;

    // IMPORTANT:
    // Close inventory/edit panel before opening checkout
    closeInventoryForm();

    // Fill checkout form
    const checkoutItem =
        document.getElementById("checkoutItem");

    const checkoutAvailable =
        document.getElementById("checkoutAvailable");

    const checkoutQuantity =
        document.getElementById("checkoutQuantity");

    const checkoutTo =
        document.getElementById("checkoutTo");

    const checkoutPurpose =
        document.getElementById("checkoutPurpose");

    if (checkoutItem) {
        checkoutItem.value =
            `${record.item} (${record.project})`;
    }

    if (checkoutAvailable) {
        checkoutAvailable.value =
            `${available} ${record.unit || ""}`;
    }

    if (checkoutQuantity) {
        checkoutQuantity.value = "";
        checkoutQuantity.max = available;
    }

    if (checkoutTo) {
        checkoutTo.value = "";
    }

    if (checkoutPurpose) {
        checkoutPurpose.value = "";
    }

    // Open ONLY checkout panel
    const checkoutPanel =
        document.getElementById("checkoutPanel");

    if (checkoutPanel) {
        checkoutPanel.classList.add("open");
    }
}


function closeCheckout() {

    selectedCheckoutRecord = null;

    const checkoutPanel =
        document.getElementById(
            "checkoutPanel"
        );

    if (checkoutPanel) {
        checkoutPanel.classList.remove("open");
    }
}

async function confirmCheckout() {

    if (!selectedCheckoutRecord) return;

    const quantity =
        Number(
            document
                .getElementById(
                    "checkoutQuantity"
                )
                .value
        );

    const checked_out_to =
        document
            .getElementById(
                "checkoutTo"
            )
            .value
            .trim();

    const purpose =
        document
            .getElementById(
                "checkoutPurpose"
            )
            .value
            .trim();

    if (
        !quantity ||
        quantity <= 0
    ) {

        alert(
            "Enter a valid quantity."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/checkouts`,
                {
                    method: "POST",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            inventory_id:
                                selectedCheckoutRecord.id,

                            quantity,

                            checked_out_to,

                            purpose
                        })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.message ||
                "Checkout failed."
            );

            return;
        }

        closeCheckout();

        await loadRecords();

        await loadCheckouts();

        renderAll();

        alert(
            "Inventory checked out successfully."
        );

    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to backend."
        );
    }
}


// ================= ADD PROJECT =================

async function addProject() {

    const input =
        document.getElementById(
            "in-newproject"
        );

    const name =
        input.value.trim();

    if (!name) {

        alert(
            "Enter a project name."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/projects`,
                {
                    method: "POST",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            name
                        })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.message ||
                "Failed to add project."
            );

            return;
        }

        input.value = "";

        await loadProjects();

        renderAll();

    } catch (error) {

        console.error(error);
    }
}


// ================= DASHBOARD =================

function renderDashboard() {

    const scoped =
        dashProject
            ? records.filter(
                record =>
                    record.project ===
                    dashProject
            )
            : records;

    const demand =
        scoped.reduce(
            (sum, record) =>
                sum + record.demand,
            0
        );

    const received =
        scoped.reduce(
            (sum, record) =>
                sum + record.received,
            0
        );

    const cost =
        scoped.reduce(
            (sum, record) =>
                sum +
                (
                    record.rate *
                    record.received
                ),
            0
        );

    document
        .getElementById(
            "statDemand"
        )
        .textContent =
            num(demand);

    document
        .getElementById(
            "statReceived"
        )
        .textContent =
            num(received);

    document
        .getElementById(
            "statCost"
        )
        .textContent =
            money(cost);

    renderDashboardTable(
        scoped
    );
}


function renderDashboardTable(rows) {

    const body =
        document.getElementById(
            "dashBody"
        );

    if (!body) return;

    body.innerHTML =
        rows.map(
            record => `
                <tr>

                    <td>
                        ${escapeHtml(record.item)}
                    </td>

                    <td>
                        ${escapeHtml(record.grade)}
                    </td>

                    <td>
                        ${escapeHtml(record.unit)}
                    </td>

                    <td class="num">
                        ${num(record.demand)}
                    </td>

                    <td class="num">
                        ${num(record.received)}
                    </td>

                    <td class="num">
                        ${money(
                            record.rate *
                            record.received
                        )}
                    </td>

                </tr>
            `
        )
        .join("");
}


// ================= CHECKOUT HISTORY =================

function renderCheckouts() {

    const body =
        document.getElementById(
            "checkoutBody"
        );

    if (!body) return;

    body.innerHTML =
        checkouts.map(
            checkout => `
                <tr>

                    <td>
                        ${escapeHtml(checkout.project)}
                    </td>

                    <td>
                        ${escapeHtml(checkout.item)}
                    </td>

                    <td>
                        ${num(checkout.quantity)}
                    </td>

                    <td>
                        ${escapeHtml(
                            checkout.checked_out_to
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            checkout.purpose
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            checkout.checked_out_by
                        )}
                    </td>

                    <td>
                        ${
                            checkout.checkout_date
                                ? new Date(
                                    checkout.checkout_date
                                )
                                    .toLocaleString()
                                : ""
                        }
                    </td>

                </tr>
            `
        )
        .join("");
}


// ================= EXPORT CSV =================

function exportCSV() {

    const rows =
        filteredLedgerRecords();

    let csv =
        "Project,Item,Grade,PO Reference,Unit,Rate,Demand,Received,Available,Remarks\n";

    rows.forEach(
        record => {

            csv += [
                record.project,
                record.item,
                record.grade,
                record.po_reference,
                record.unit,
                record.rate,
                record.demand,
                record.received,
                availableQuantity(record),
                record.remarks
            ]
                .map(
                    value =>
                        `"${String(value ?? "").replace(/"/g, '""')}"`
                )
                .join(",");

            csv += "\n";
        }
    );

    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href = url;

    link.download =
        "inventory.csv";

    link.click();

    URL.revokeObjectURL(
        url
    );
}


// ================= TABS =================

function switchTab(tab) {

    activeTab = tab;

    document
        .querySelectorAll(
            ".tabbar button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",

                    button.dataset.tab ===
                    tab
                );
            }
        );

    document
        .getElementById(
            "tab-ledger"
        )
        .style.display =
            tab === "ledger"
                ? "block"
                : "none";

    document
        .getElementById(
            "tab-dashboard"
        )
        .style.display =
            tab === "dashboard"
                ? "block"
                : "none";

    document
        .getElementById(
            "tab-checkouts"
        )
        .style.display =
            tab === "checkouts"
                ? "block"
                : "none";
}

async function updateInventoryRecord(
    id,
    field,
    value
) {

    const record =
        records.find(
            record =>
                String(record.id) ===
                String(id)
        );


    if (!record) return;


    const updatedRecord = {

        project:
            record.project,

        item:
            record.item,

        grade:
            record.grade,

        po_reference:
            record.po_reference,

        unit:
            record.unit,

        rate:
            record.rate,

        demand:
            record.demand,

        received:
            record.received,

        remarks:
            record.remarks

    };


    updatedRecord[field] =
        value;


    try {

        const response =
            await fetch(
                `${API_URL}/inventory/${id}`,
                {

                    method:
                        "PUT",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify(
                            updatedRecord
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to update inventory."
            );

            return;

        }


        Object.assign(
            record,
            updatedRecord
        );


        await loadRecords();

        renderAll();


    } catch (error) {

        console.error(
            "Update error:",
            error
        );

        alert(
            "Unable to update inventory."
        );

    }

}
// ================= RENDER ALL =================

function renderAll() {

    renderLedger();

    renderDashboard();

    renderCheckouts();
}


// ================= INITIALIZE =================

async function init() {

    try {

        await loadProjects();

        await loadRecords();

        await loadCheckouts();

        renderAll();

        console.log(
            "Application loaded successfully."
        );

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );
    }
}


// ================= EVENTS =================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .getElementById(
                "userInfo"
            )
            ?.append(
                `${user.username} (${user.role})`
            );


        document
            .getElementById(
                "f-search"
            )
            ?.addEventListener(
                "input",
                renderLedger
            );


        document
            .getElementById(
                "f-project"
            )
            ?.addEventListener(
                "change",
                renderLedger
            );

        document
            .getElementById("addRowBtn")
            ?.addEventListener("click", function (event) {

                event.preventDefault();
                event.stopPropagation();

                console.log("Add Row button clicked");

                // Check permission
                if (!canManageInventory()) {
                    alert("You do not have permission to add inventory.");
                    return;
                }

                // Open the inventory form
                openInventoryForm();
            });


        // ================= PERMISSION VISIBILITY =================

        if (!canManageInventory()) {

            const addRowBtn =
                document.getElementById("addRowBtn");

            const manageProjectsBtn =
                document.getElementById("manageProjectsBtn");

            if (addRowBtn) {
                addRowBtn.style.display = "none";
            }

            if (manageProjectsBtn) {
                manageProjectsBtn.style.display = "none";
            }

        } else {

            // Make sure the button is visible for admin/manager
            const addRowBtn =
                document.getElementById("addRowBtn");

            if (addRowBtn) {
                addRowBtn.style.display = "inline-block";
            }
        }


            document
    .getElementById("ledgerBody")
    ?.addEventListener("dblclick", event => {

        if (!canEdit) {
            return;
        }

        const cell = event.target.closest("td.editable");

        if (!cell) {
            return;
        }

        if (cell.querySelector("input, select")) {
            return;
        }

        const row = cell.closest("tr");

        if (!row) {
            return;
        }

        const id = row.dataset.id;
        const field = cell.dataset.field;

        const record = records.find(
            record =>
                String(record.id) === String(id)
        );

        if (!record) {
            return;
        }

        const oldValue = record[field] ?? "";

        /*
         * PROJECT DROPDOWN
         */
        if (field === "project") {

            const select = document.createElement("select");

            select.className = "cell-select";

            select.innerHTML = `
                <option value="">Select Project</option>
            `;

            projects.forEach(project => {

                const option =
                    document.createElement("option");

                option.value = project.name;
                option.textContent = project.name;

                if (project.name === oldValue) {
                    option.selected = true;
                }

                select.appendChild(option);
            });

            cell.innerHTML = "";
            cell.appendChild(select);

            select.focus();

            let saved = false;

            async function saveProject() {

                if (saved) {
                    return;
                }

                saved = true;

                const newValue = select.value.trim();

                if (newValue === String(oldValue)) {
                    renderLedger();
                    return;
                }

                await updateInventoryRecord(
                    id,
                    field,
                    newValue
                );
            }

            select.addEventListener(
                "change",
                saveProject
            );

            select.addEventListener(
                "blur",
                saveProject
            );

            return;
        }

        /*
         * NUMBER FIELDS
         */
        if (
            field === "rate" ||
            field === "demand" ||
            field === "received"
        ) {

            const input =
                document.createElement("input");

            input.type = "number";
            input.className = "cell-input";
            input.value = oldValue;

            cell.innerHTML = "";
            cell.appendChild(input);

            input.focus();
            input.select();

            let saved = false;

            async function saveNumber() {

                if (saved) {
                    return;
                }

                saved = true;

                const newValue =
                    Number(input.value) || 0;

                if (
                    newValue === Number(oldValue)
                ) {
                    renderLedger();
                    return;
                }

                await updateInventoryRecord(
                    id,
                    field,
                    newValue
                );
            }

            input.addEventListener(
                "blur",
                saveNumber,
                { once: true }
            );

            input.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {
                        input.blur();
                    }

                    if (event.key === "Escape") {
                        renderLedger();
                    }
                }
            );

            return;
        }

        /*
         * NORMAL TEXT FIELDS
         */
        const input =
            document.createElement("input");

        input.type = "text";
        input.className = "cell-input";
        input.value = oldValue;

        cell.innerHTML = "";
        cell.appendChild(input);

        input.focus();
        input.select();

        let saved = false;

        async function saveValue() {

            if (saved) {
                return;
            }

            saved = true;

            const newValue =
                input.value.trim();

            if (
                newValue ===
                String(oldValue)
            ) {
                renderLedger();
                return;
            }

            await updateInventoryRecord(
                id,
                field,
                newValue
            );
        }

        input.addEventListener(
            "blur",
            saveValue,
            { once: true }
        );

        input.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    input.blur();
                }

                if (event.key === "Escape") {
                    renderLedger();
                }
            }
        );
    });
        

        document
            .getElementById(
                "saveInventoryBtn"
            )
            ?.addEventListener(
                "click",
                saveInventory
            );


        document
            .getElementById(
                "cancelInventoryBtn"
            )
            ?.addEventListener(
                "click",
                closeInventoryForm
            );


        document
            .getElementById(
                "manageProjectsBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "projectPanel"
                        )
                        .style.display =
                            "block";
                }
            );


        document
            .getElementById(
                "closeProjectsBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "projectPanel"
                        )
                        .style.display =
                            "none";
                }
            );


        document
            .getElementById(
                "addProjectBtn"
            )
            ?.addEventListener(
                "click",
                addProject
            );


        document
            .getElementById(
                "exportBtn"
            )
            ?.addEventListener(
                "click",
                exportCSV
            );


       document
    .getElementById("ledgerBody")
    ?.addEventListener("click", event => {

        const target =
            event.target.closest("button");

        if (!target) {
            return;
        }

        /*
         * EDIT
         */
        if (target.dataset.edit) {

            event.stopPropagation();

            openInventoryForm(
                target.dataset.edit
            );

            return;
        }

        /*
         * DELETE
         */
        if (target.dataset.delete) {

            event.stopPropagation();

            deleteInventory(
                target.dataset.delete
            );

            return;
        }

        /*
         * CHECKOUT
         */
        if (target.dataset.checkout) {

            event.stopPropagation();

            openCheckout(
                target.dataset.checkout
            );

            return;
        }

    });


        document
            .getElementById(
                "confirmCheckoutBtn"
            )
            ?.addEventListener(
                "click",
                confirmCheckout
            );


        document
            .getElementById(
                "cancelCheckoutBtn"
            )
            ?.addEventListener(
                "click",
                closeCheckout
            );


        document
            .querySelectorAll(
                ".tabbar button"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            switchTab(
                                button.dataset.tab
                            )
                    );
                }
            );


        document
            .getElementById(
                "logoutBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    localStorage.clear();

                    window.location.href =
                        "login.html";
                }
            );


        if (!canManageInventory()) {

            const addRowBtn =
                document.getElementById("addRowBtn");

            const manageProjectsBtn =
                document.getElementById("manageProjectsBtn");

            if (addRowBtn) {
                addRowBtn.style.display = "none";
            }

            if (manageProjectsBtn) {
                manageProjectsBtn.style.display = "none";
            }
        }


        init();
    }
);