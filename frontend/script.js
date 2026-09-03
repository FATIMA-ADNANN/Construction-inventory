const API_URL = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const user = JSON.parse(
    localStorage.getItem("user") || "null"
);

if (!token || !user) {
    window.location.href = "login.html";
}


// ================= DATA =================

let records = [];
let projects = [];
let checkouts = [];
let auditLogs = [];
let systemUsers = [];

let selectedCheckoutRecord = null;
let editingRecordId = null;
let activeTab = "ledger";
let dashProject = "";
let attachmentInventoryId = null;

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
            await response
                .json()
                .catch(() => null);

        if (response.status === 401) {

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


// =================================================
// ================= USERS =========================
// =================================================

async function loadUsers() {

    if (getRole() !== "admin") {
        return;
    }

    const response =
        await fetch(
            `${API_URL}/users`,
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
            "Failed to load users."
        );
    }

    systemUsers =
        await response.json();
}


function renderUsers() {

    if (getRole() !== "admin") {
        return;
    }

    const body =
        document.getElementById(
            "usersBody"
        );

    const empty =
        document.getElementById(
            "usersEmpty"
        );

    const filter =
        document.getElementById(
            "userRoleFilter"
        )?.value || "";

    if (!body) {
        return;
    }

    const users =
        filter
            ? systemUsers.filter(
                account =>
                    account.role === filter
            )
            : systemUsers;


    if (empty) {

        empty.style.display =
            users.length
                ? "none"
                : "block";
    }


    body.innerHTML =
        users.map(account => `

            <tr>

                <td>

                    <strong>
                        ${escapeHtml(
                            account.username
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeHtml(
                        account.email
                    )}

                </td>


                <td>

                    <select
                        class="user-role-select"
                        data-user-role="${account.id}"
                    >

                        <option
                            value="admin"
                            ${
                                account.role === "admin"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Admin
                        </option>

                        <option
                            value="manager"
                            ${
                                account.role === "manager"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Manager
                        </option>

                        <option
                            value="engineer"
                            ${
                                account.role === "engineer"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Engineer
                        </option>

                        <option
                            value="viewer"
                            ${
                                account.role === "viewer"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Viewer
                        </option>

                    </select>

                </td>


                <td>

                    <span
                        class="
                            user-status
                            ${
                                Number(
                                    account.is_active
                                )
                                    ? "active"
                                    : "disabled"
                            }
                        "
                    >

                        ${
                            Number(
                                account.is_active
                            )
                                ? "Active"
                                : "Disabled"
                        }

                    </span>

                </td>


                <td>

                    ${
                        account.created_at
                            ? new Date(
                                account.created_at
                            ).toLocaleDateString()
                            : ""
                    }

                </td>


                <td>

                    <div class="user-actions">

                        <button
                            type="button"
                            class="btn small secondary"
                            data-reset-password="${account.id}"
                        >
                            Password
                        </button>

                        <button
                            type="button"
                            class="btn small ${
                                Number(
                                    account.is_active
                                )
                                    ? "rebar"
                                    : ""
                            }"
                            data-user-status="${account.id}"
                            data-active="${
                                Number(
                                    account.is_active
                                )
                            }"
                        >

                            ${
                                Number(
                                    account.is_active
                                )
                                    ? "Disable"
                                    : "Enable"
                            }

                        </button>

                    </div>

                </td>

            </tr>

        `).join("");
}


async function createUser() {

    if (getRole() !== "admin") {
        return;
    }

    const username =
        document
            .getElementById(
                "newUsername"
            )
            ?.value
            .trim();

    const email =
        document
            .getElementById(
                "newUserEmail"
            )
            ?.value
            .trim();

    const password =
        document
            .getElementById(
                "newUserPassword"
            )
            ?.value;

    const role =
        document
            .getElementById(
                "newUserRole"
            )
            ?.value;


    if (
        !username ||
        !email ||
        !password ||
        !role
    ) {

        alert(
            "Please complete all fields."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/users`,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            username,
                            email,
                            password,
                            role
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to create user."
            );

            return;
        }


        document
            .getElementById(
                "newUsername"
            )
            .value = "";

        document
            .getElementById(
                "newUserEmail"
            )
            .value = "";

        document
            .getElementById(
                "newUserPassword"
            )
            .value = "";

        document
            .getElementById(
                "addUserPanel"
            )
            .style.display =
                "none";


        await loadUsers();

        renderUsers();


        alert(
            "User created successfully."
        );


    } catch (error) {

        console.error(
            "CREATE USER ERROR:",
            error
        );

        alert(
            "Unable to create user."
        );
    }
}


async function changeUserRole(
    userId,
    role
) {

    try {

        const response =
            await fetch(
                `${API_URL}/users/${userId}/role`,
                {

                    method:
                        "PUT",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            role
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to change role."
            );

            await loadUsers();

            renderUsers();

            return;
        }


        await loadUsers();

        renderUsers();


    } catch (error) {

        console.error(
            "ROLE UPDATE ERROR:",
            error
        );

        alert(
            "Unable to update user role."
        );
    }
}


async function changeUserStatus(
    userId,
    currentStatus
) {

    const newStatus =
        !Boolean(
            Number(currentStatus)
        );


    const confirmed =
        confirm(
            newStatus
                ? "Enable this user?"
                : "Disable this user?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/users/${userId}/status`,
                {

                    method:
                        "PUT",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            is_active:
                                newStatus
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to update user."
            );

            return;
        }


        await loadUsers();

        renderUsers();


    } catch (error) {

        console.error(
            "STATUS ERROR:",
            error
        );

        alert(
            "Unable to update user status."
        );
    }
}


async function resetUserPassword(
    userId
) {

    const password =
        prompt(
            "Enter the new password:"
        );


    if (!password) {
        return;
    }


    if (password.length < 6) {

        alert(
            "Password must be at least 6 characters."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/users/${userId}/password`,
                {

                    method:
                        "PUT",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            password
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to change password."
            );

            return;
        }


        alert(
            "Password changed successfully."
        );


    } catch (error) {

        console.error(
            "PASSWORD RESET ERROR:",
            error
        );

        alert(
            "Unable to change password."
        );
    }
}


// =================================================
// ================= AUDIT =========================
// =================================================

async function loadAuditLogs() {

    if (getRole() !== "admin") {
        return;
    }

    const response =
        await fetch(
            `${API_URL}/audit`,
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
            "Failed to load audit history"
        );
    }

    auditLogs =
        await response.json();
}


function formatAuditChanges(changes) {

    if (!changes) {
        return "";
    }

    if (
        typeof changes ===
        "string"
    ) {

        try {

            changes =
                JSON.parse(changes);

        } catch {

            return escapeHtml(
                changes
            );
        }
    }


    const labels = {

        project:
            "Project",

        item:
            "Item",

        grade:
            "Grade / Size",

        po_reference:
            "PO Reference",

        unit:
            "Unit",

        rate:
            "Rate",

        demand:
            "Demand",

        received:
            "Received",

        remarks:
            "Remarks",

        quantity:
            "Quantity",

        checked_out_to:
            "Issued To",

        purpose:
            "Purpose",

        file_name:
            "File",

        file_path:
            "File Path",

        imported_rows:
            "Imported Rows"
    };


    return Object
        .entries(changes)
        .map(
            ([field, value]) => {

                const label =
                    labels[field] ||
                    field;


                if (
                    value &&
                    typeof value ===
                    "object" &&
                    "old" in value &&
                    "new" in value
                ) {

                    return `
                        <div class="audit-change">

                            <strong>
                                ${escapeHtml(label)}
                            </strong>

                            <span class="audit-old">
                                ${escapeHtml(
                                    value.old
                                )}
                            </span>

                            →

                            <span class="audit-new">
                                ${escapeHtml(
                                    value.new
                                )}
                            </span>

                        </div>
                    `;
                }


                if (
                    field ===
                    "file_path"
                ) {

                    return "";
                }


                return `
                    <div class="audit-change">

                        <strong>
                            ${escapeHtml(label)}:
                        </strong>

                        <span>
                            ${escapeHtml(value)}
                        </span>

                    </div>
                `;
            }
        )
        .join("");
}


function renderAuditLogs() {

    if (
        getRole() !== "admin"
    ) {
        return;
    }


    const body =
        document.getElementById(
            "auditBody"
        );

    const empty =
        document.getElementById(
            "auditEmpty"
        );


    if (!body) {
        return;
    }


    if (empty) {

        empty.style.display =
            auditLogs.length
                ? "none"
                : "block";
    }


    body.innerHTML =
        auditLogs.map(
            log => `

                <tr>

                    <td>

                        <strong>
                            ${escapeHtml(
                                log.username
                            )}
                        </strong>

                        <div class="audit-role">

                            ${escapeHtml(
                                log.role
                            )}

                        </div>

                    </td>


                    <td>

                        <span
                            class="
                                audit-action
                                audit-${
                                    String(
                                        log.action
                                    ).toLowerCase()
                                }
                            "
                        >

                            ${escapeHtml(
                                log.action
                            )}

                        </span>

                    </td>


                    <td>

                        ${escapeHtml(
                            log.entity_name ||
                            ""
                        )}

                    </td>


                    <td>

                        ${formatAuditChanges(
                            log.changes
                        )}

                    </td>


                    <td>

                        ${
                            log.created_at
                                ? new Date(
                                    log.created_at
                                ).toLocaleString()
                                : ""
                        }

                    </td>

                </tr>

            `
        )
        .join("");
}


// =================================================
// ================= PROJECTS ======================
// =================================================

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

    projects =
        await response.json();
}


async function loadDashboardProjects() {

    const dropdown =
        document.getElementById(
            "dashboard-project"
        );

    if (!dropdown) {
        return;
    }


    const current =
        dropdown.value;


    dropdown.innerHTML =
        `
            <option value="">
                All Projects
            </option>
        `;


    projects.forEach(
        project => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                project.name;

            option.textContent =
                project.name;

            dropdown.appendChild(
                option
            );
        }
    );


    dropdown.value =
        current || dashProject;
}


function populateInventoryProjectDropdown() {

    const select =
        document.getElementById(
            "in-project"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        `
            <option value="">
                Select Project
            </option>
        `;


    projects.forEach(
        project => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                project.name;

            option.textContent =
                project.name;

            select.appendChild(
                option
            );
        }
    );
}


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

    if (!select) {
        return;
    }


    const current =
        select.value;


    select.innerHTML =
        `
            <option value="">
                All Projects
            </option>
        ` +
        uniqueProjects()
            .map(
                project =>
                    `
                        <option value="${escapeHtml(project)}">
                            ${escapeHtml(project)}
                        </option>
                    `
            )
            .join("");


    select.value =
        current;
}


async function addProject() {

    const input =
        document.getElementById(
            "in-newproject"
        );

    if (!input) {
        return;
    }


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

                    method:
                        "POST",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            name
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to add project."
            );

            return;
        }


        input.value = "";


        await loadProjects();

        await loadDashboardProjects();

        renderAll();


    } catch (error) {

        console.error(
            "ADD PROJECT ERROR:",
            error
        );
    }
}


// =================================================
// ================= INVENTORY =====================
// =================================================

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
        data.map(
            record => ({

                ...record,

                rate:
                    Number(
                        record.rate
                    ) || 0,

                demand:
                    Number(
                        record.demand
                    ) || 0,

                received:
                    Number(
                        record.received
                    ) || 0,

                checked_out:
                    Number(
                        record.checked_out
                    ) || 0

            })
        );
}


function availableQuantity(
    record
) {

    return Math.max(

        0,

        Number(
            record.received
        ) -

        Number(
            record.checked_out
        )
    );
}


function filteredLedgerRecords() {

    const search =
        document
            .getElementById(
                "f-search"
            )
            ?.value
            .toLowerCase()
            .trim() || "";


    const project =
        document
            .getElementById(
                "f-project"
            )
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

                (
                    !project ||
                    record.project === project
                )

                &&

                (
                    !search ||
                    text.includes(search)
                )
            );
        }
    );
}


function renderLedger() {

    renderProjectFilterOptions();


    const rows =
        filteredLedgerRecords();


    const body =
        document.getElementById(
            "ledgerBody"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!body) {
        return;
    }


    if (emptyState) {

        emptyState.style.display =
            rows.length
                ? "none"
                : "block";
    }


    body.innerHTML =
        rows.map(
            record => {

                const available =
                    availableQuantity(
                        record
                    );


                const cost =
                    Number(record.rate) *
                    Number(record.received);


                return `

                    <tr data-id="${record.id}">

                        <td
                            class="${
                                canEdit
                                    ? "editable"
                                    : ""
                            }"
                            data-field="project"
                        >
                            ${escapeHtml(
                                record.project
                            )}
                        </td>


                        <td
                            class="${
                                canEdit
                                    ? "editable"
                                    : ""
                            }"
                            data-field="item"
                        >
                            ${escapeHtml(
                                record.item
                            )}
                        </td>


                        <td
                            class="${
                                canEdit
                                    ? "editable"
                                    : ""
                            }"
                            data-field="grade"
                        >
                            ${escapeHtml(
                                record.grade
                            )}
                        </td>


                        <td
                            class="${
                                canEdit
                                    ? "editable"
                                    : ""
                            }"
                            data-field="po_reference"
                        >
                            ${escapeHtml(
                                record.po_reference
                            )}
                        </td>


                        <td
                            class="${
                                canEdit
                                    ? "editable"
                                    : ""
                            }"
                            data-field="unit"
                        >
                            ${escapeHtml(
                                record.unit
                            )}
                        </td>


                        <td
                            class="
                                num
                                ${
                                    canEdit
                                        ? "editable"
                                        : ""
                                }
                            "
                            data-field="rate"
                        >

                            ${
                                canEdit
                                    ? `
                                        <input
                                            type="number"
                                            value="${record.rate}"
                                            data-field="rate"
                                        >
                                    `
                                    : money(
                                        record.rate
                                    )
                            }

                        </td>


                        <td
                            class="
                                num
                                ${
                                    canEdit
                                        ? "editable"
                                        : ""
                                }
                            "
                            data-field="demand"
                        >

                            ${
                                canEdit
                                    ? `
                                        <input
                                            type="number"
                                            value="${record.demand}"
                                            data-field="demand"
                                        >
                                    `
                                    : num(
                                        record.demand
                                    )
                            }

                        </td>


                        <td
                            class="
                                num
                                ${
                                    canEdit
                                        ? "editable"
                                        : ""
                                }
                            "
                            data-field="received"
                        >

                            ${
                                canEdit
                                    ? `
                                        <input
                                            type="number"
                                            value="${record.received}"
                                            data-field="received"
                                        >
                                    `
                                    : num(
                                        record.received
                                    )
                            }

                        </td>


                        <td
                            class="
                                num
                                available-qty
                            "
                        >

                            ${num(
                                available
                            )}

                        </td>


                        <td class="num">

                            ${money(
                                cost
                            )}

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
                            class="${
                                canEdit
                                    ? "editable"
                                    : ""
                            }"
                            data-field="remarks"
                        >

                            ${escapeHtml(
                                record.remarks
                            )}

                        </td>


                        <td>

                            <button
                                type="button"
                                class="attachment-view-btn"
                                data-view-attachments="${record.id}"
                            >
                                View
                            </button>


                            ${
                                canManageInventory()
                                    ? `
                                        <button
                                            type="button"
                                            class="attachment-btn"
                                            data-attachment="${record.id}"
                                        >
                                            + Attach
                                        </button>
                                    `
                                    : ""
                            }

                        </td>


                        <td>

                            <div class="rowbtns">

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
            }
        )
        .join("");
}


function openInventoryForm(
    id = null
) {

    if (
        !canManageInventory()
    ) {

        alert(
            "You do not have permission to manage inventory."
        );

        return;
    }


    closeCheckout();


    editingRecordId =
        id;


    const panel =
        document.getElementById(
            "inventoryPanel"
        );


    if (!panel) {
        return;
    }


    populateInventoryProjectDropdown();


    const record =
        id
            ? records.find(
                item =>
                    String(item.id) ===
                    String(id)
            )
            : null;


    const title =
        document.getElementById(
            "inventoryFormTitle"
        );


    if (title) {

        title.textContent =
            record
                ? "Edit Inventory Item"
                : "Add Inventory Item";
    }


    document
        .getElementById(
            "in-project"
        )
        .value =
            record?.project || "";


    document
        .getElementById(
            "in-item"
        )
        .value =
            record?.item || "";


    document
        .getElementById(
            "in-grade"
        )
        .value =
            record?.grade || "";


    document
        .getElementById(
            "in-po"
        )
        .value =
            record?.po_reference || "";


    document
        .getElementById(
            "in-unit"
        )
        .value =
            record?.unit || "";


    document
        .getElementById(
            "in-rate"
        )
        .value =
            record?.rate || 0;


    document
        .getElementById(
            "in-demand"
        )
        .value =
            record?.demand || 0;


    document
        .getElementById(
            "in-received"
        )
        .value =
            record?.received || 0;


    document
        .getElementById(
            "in-remarks"
        )
        .value =
            record?.remarks || "";


    panel.style.display =
        "block";
}


function closeInventoryForm() {

    editingRecordId =
        null;


    const panel =
        document.getElementById(
            "inventoryPanel"
        );


    if (panel) {

        panel.style.display =
            "none";
    }
}


async function saveInventory() {

    if (
        !canManageInventory()
    ) {

        alert(
            "You do not have permission to manage inventory."
        );

        return;
    }


    const payload = {

        project:
            document
                .getElementById(
                    "in-project"
                )
                .value
                .trim(),

        item:
            document
                .getElementById(
                    "in-item"
                )
                .value
                .trim(),

        grade:
            document
                .getElementById(
                    "in-grade"
                )
                .value
                .trim(),

        po_reference:
            document
                .getElementById(
                    "in-po"
                )
                .value
                .trim(),

        unit:
            document
                .getElementById(
                    "in-unit"
                )
                .value
                .trim(),

        rate:
            Number(
                document
                    .getElementById(
                        "in-rate"
                    )
                    .value
            ) || 0,

        demand:
            Number(
                document
                    .getElementById(
                        "in-demand"
                    )
                    .value
            ) || 0,

        received:
            Number(
                document
                    .getElementById(
                        "in-received"
                    )
                    .value
            ) || 0,

        remarks:
            document
                .getElementById(
                    "in-remarks"
                )
                .value
                .trim()
    };


    if (!payload.project) {

        alert(
            "Please select a project."
        );

        return;
    }


    if (!payload.item) {

        alert(
            "Item name is required."
        );

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
                        JSON.stringify(
                            payload
                        )
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


        if (
            getRole() === "admin"
        ) {

            await loadAuditLogs()
                .catch(() => {});
        }


        renderAll();


        alert(
            wasEditing
                ? "Inventory updated successfully."
                : "Inventory added successfully."
        );


    } catch (error) {

        console.error(
            "SAVE INVENTORY ERROR:",
            error
        );

        alert(
            "Unable to connect to backend."
        );
    }
}


async function updateInventoryRecord(
    id,
    field,
    value
) {

    const record =
        records.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!record) {
        return;
    }


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
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            alert(
                data.message ||
                "Failed to update inventory."
            );

            return;
        }


        await loadRecords();


        if (
            getRole() === "admin"
        ) {

            await loadAuditLogs()
                .catch(() => {});
        }


        renderAll();


    } catch (error) {

        console.error(
            "UPDATE INVENTORY ERROR:",
            error
        );

        alert(
            "Unable to update inventory."
        );
    }
}


async function deleteInventory(
    id
) {

    if (
        !canDeleteInventory()
    ) {

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

                    method:
                        "DELETE",

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

        await loadAuditLogs()
            .catch(() => {});


        renderAll();


        alert(
            "Inventory item deleted successfully."
        );


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            "Unable to connect to backend."
        );
    }
}


// =================================================
// ================= CHECKOUT ======================
// =================================================

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


function openCheckout(
    id
) {

    const record =
        records.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!record) {
        return;
    }


    const available =
        availableQuantity(
            record
        );


    if (available <= 0) {

        alert(
            "No quantity is available for checkout."
        );

        return;
    }


    selectedCheckoutRecord =
        record;


    closeInventoryForm();


    const checkoutItem =
        document.getElementById(
            "checkoutItem"
        );

    const checkoutAvailable =
        document.getElementById(
            "checkoutAvailable"
        );

    const checkoutQuantity =
        document.getElementById(
            "checkoutQuantity"
        );

    const checkoutTo =
        document.getElementById(
            "checkoutTo"
        );

    const checkoutPurpose =
        document.getElementById(
            "checkoutPurpose"
        );


    if (checkoutItem) {

        checkoutItem.value =
            `${record.item} (${record.project})`;
    }


    if (checkoutAvailable) {

        checkoutAvailable.value =
            `${available} ${record.unit || ""}`;
    }


    if (checkoutQuantity) {

        checkoutQuantity.value =
            "";

        checkoutQuantity.max =
            available;
    }


    if (checkoutTo) {

        checkoutTo.value =
            "";
    }


    if (checkoutPurpose) {

        checkoutPurpose.value =
            "";
    }


    const checkoutPanel =
        document.getElementById(
            "checkoutPanel"
        );


    if (checkoutPanel) {

        checkoutPanel.classList.add(
            "open"
        );
    }
}


function closeCheckout() {

    selectedCheckoutRecord =
        null;


    const checkoutPanel =
        document.getElementById(
            "checkoutPanel"
        );


    if (checkoutPanel) {

        checkoutPanel.classList.remove(
            "open"
        );
    }
}


async function confirmCheckout() {

    if (
        !selectedCheckoutRecord
    ) {
        return;
    }


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


    if (!checked_out_to) {

        alert(
            "Please enter who the material is being issued to."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/checkouts`,
                {

                    method:
                        "POST",

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
            await response
                .json()
                .catch(() => ({}));


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


        if (
            getRole() === "admin"
        ) {

            await loadAuditLogs()
                .catch(() => {});
        }


        renderAll();


        alert(
            "Inventory checked out successfully."
        );


    } catch (error) {

        console.error(
            "CHECKOUT ERROR:",
            error
        );

        alert(
            "Unable to connect to backend."
        );
    }
}


function renderCheckouts() {

    const body =
        document.getElementById(
            "checkoutBody"
        );


    const empty =
        document.getElementById(
            "checkoutEmpty"
        );


    if (!body) {
        return;
    }


    if (empty) {

        empty.style.display =
            checkouts.length
                ? "none"
                : "block";
    }


    body.innerHTML =
        checkouts.map(
            checkout => `

                <tr>

                    <td>
                        ${escapeHtml(
                            checkout.project
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            checkout.item
                        )}
                    </td>

                    <td>
                        ${num(
                            checkout.quantity
                        )}
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
                                ).toLocaleString()
                                : ""
                        }

                    </td>

                </tr>

            `
        )
        .join("");
}


// =================================================
// ================= DASHBOARD =====================
// =================================================

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
                sum +
                Number(
                    record.demand || 0
                ),
            0
        );


    const received =
        scoped.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.received || 0
                ),
            0
        );


    const checkedOut =
        scoped.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.checked_out || 0
                ),
            0
        );


    const available =
        scoped.reduce(
            (sum, record) =>
                sum +
                availableQuantity(
                    record
                ),
            0
        );


    const cost =
        scoped.reduce(
            (sum, record) =>
                sum +
                (
                    Number(
                        record.rate || 0
                    )
                    *
                    Number(
                        record.received || 0
                    )
                ),
            0
        );


    const completion =
        demand > 0
            ? Math.min(
                100,
                (
                    received /
                    demand
                ) * 100
            )
            : 0;


    const demandEl =
        document.getElementById(
            "statDemand"
        );

    const receivedEl =
        document.getElementById(
            "statReceived"
        );

    const availableEl =
        document.getElementById(
            "statAvailable"
        );

    const checkedOutEl =
        document.getElementById(
            "statCheckedOut"
        );

    const completionEl =
        document.getElementById(
            "statCompletion"
        );

    const costEl =
        document.getElementById(
            "statCost"
        );


    if (demandEl) {
        demandEl.textContent =
            num(demand);
    }

    if (receivedEl) {
        receivedEl.textContent =
            num(received);
    }

    if (availableEl) {
        availableEl.textContent =
            num(available);
    }

    if (checkedOutEl) {
        checkedOutEl.textContent =
            num(checkedOut);
    }

    if (completionEl) {

        completionEl.textContent =
            `${completion.toFixed(1)}%`;
    }

    if (costEl) {

        costEl.textContent =
            money(cost);
    }


    renderDashboardTable(
        scoped
    );
}


function renderDashboardTable(
    rows
) {

    const body =
        document.getElementById(
            "dashBody"
        );

    const empty =
        document.getElementById(
            "dashEmpty"
        );


    if (!body) {
        return;
    }


    if (empty) {

        empty.style.display =
            rows.length
                ? "none"
                : "block";
    }


    body.innerHTML =
        rows.map(
            record => `

                <tr>

                    <td>
                        ${escapeHtml(
                            record.project
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            record.item
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            record.grade
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            record.unit
                        )}
                    </td>

                    <td class="num">
                        ${num(
                            record.demand
                        )}
                    </td>

                    <td class="num">
                        ${num(
                            record.received
                        )}
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


// =================================================
// ================= CSV / EXCEL ===================
// =================================================

function parseCSVLine(
    line
) {

    const values = [];

    let current = "";

    let insideQuotes =
        false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const char =
            line[i];

        const next =
            line[i + 1];


        if (
            char === '"'
        ) {

            if (
                insideQuotes &&
                next === '"'
            ) {

                current += '"';

                i++;

            } else {

                insideQuotes =
                    !insideQuotes;
            }

        } else if (
            char === "," &&
            !insideQuotes
        ) {

            values.push(
                current.trim()
            );

            current =
                "";

        } else {

            current +=
                char;
        }
    }


    values.push(
        current.trim()
    );


    return values;
}


function parseInventoryCSV(
    csvText
) {

    const lines =
        csvText
            .split(/\r?\n/)
            .filter(
                line =>
                    line.trim()
            );


    if (
        lines.length < 2
    ) {

        throw new Error(
            "CSV contains no inventory rows."
        );
    }


    const headers =
        parseCSVLine(
            lines[0]
        )
            .map(
                header =>
                    header
                        .replace(
                            /^\uFEFF/,
                            ""
                        )
                        .trim()
                        .toLowerCase()
            );


    const requiredHeaders = [
        "project",
        "item"
    ];


    for (
        const required
        of requiredHeaders
    ) {

        if (
            !headers.includes(
                required
            )
        ) {

            throw new Error(
                `Missing required column: ${required}`
            );
        }
    }


    const rows = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        const values =
            parseCSVLine(
                lines[i]
            );


        const row = {};


        headers.forEach(
            (
                header,
                index
            ) => {

                row[header] =
                    values[index] ??
                    "";
            }
        );


        rows.push({

            rowNumber:
                i + 1,

            project:
                row["project"]
                    ?.trim() ||
                "",

            item:
                row["item"]
                    ?.trim() ||
                "",

            grade:
                row["grade"]
                    ?.trim() ||
                "",

            po_reference:
                (
                    row[
                        "po reference"
                    ]
                    ??
                    row[
                        "po_reference"
                    ]
                    ??
                    ""
                ).trim(),

            unit:
                row["unit"]
                    ?.trim() ||
                "",

            rate:
                Number(
                    row["rate"]
                ) || 0,

            demand:
                Number(
                    row["demand"]
                ) || 0,

            received:
                Number(
                    row["received"]
                ) || 0,

            remarks:
                row["remarks"]
                    ?.trim() ||
                ""
        });
    }


    return rows;
}


async function parseExcelFile(
    file
) {

    const buffer =
        await file.arrayBuffer();


    const workbook =
        XLSX.read(
            buffer,
            {
                type:
                    "array"
            }
        );


    const firstSheetName =
        workbook.SheetNames[0];


    if (!firstSheetName) {

        throw new Error(
            "Excel file does not contain any worksheets."
        );
    }


    const worksheet =
        workbook.Sheets[
            firstSheetName
        ];


    const data =
        XLSX.utils
            .sheet_to_json(
                worksheet,
                {
                    defval:
                        ""
                }
            );


    if (!data.length) {

        throw new Error(
            "Excel file contains no inventory rows."
        );
    }


    return data.map(
        (
            row,
            index
        ) => {

            const normalized =
                {};


            Object
                .keys(row)
                .forEach(
                    key => {

                        const cleanKey =
                            String(key)
                                .replace(
                                    /^\uFEFF/,
                                    ""
                                )
                                .trim()
                                .toLowerCase();


                        normalized[
                            cleanKey
                        ] =
                            row[key];
                    }
                );


            return {

                rowNumber:
                    index + 2,

                project:
                    String(
                        normalized[
                            "project"
                        ] ||
                        ""
                    ).trim(),

                item:
                    String(
                        normalized[
                            "item"
                        ] ||
                        ""
                    ).trim(),

                grade:
                    String(
                        normalized[
                            "grade"
                        ] ||
                        normalized[
                            "grade / size"
                        ] ||
                        ""
                    ).trim(),

                po_reference:
                    String(
                        normalized[
                            "po reference"
                        ]
                        ??
                        normalized[
                            "po_reference"
                        ]
                        ??
                        ""
                    ).trim(),

                unit:
                    String(
                        normalized[
                            "unit"
                        ] ||
                        ""
                    ).trim(),

                rate:
                    Number(
                        normalized[
                            "rate"
                        ]
                    ) || 0,

                demand:
                    Number(
                        normalized[
                            "demand"
                        ]
                    ) || 0,

                received:
                    Number(
                        normalized[
                            "received"
                        ]
                    ) || 0,

                remarks:
                    String(
                        normalized[
                            "remarks"
                        ] ||
                        ""
                    ).trim()
            };
        }
    );
}


async function readInventoryImportFile(
    file
) {

    const fileName =
        file.name
            .toLowerCase();


    if (
        fileName.endsWith(
            ".xlsx"
        )
    ) {

        return await parseExcelFile(
            file
        );
    }


    if (
        fileName.endsWith(
            ".csv"
        )
    ) {

        const text =
            await file.text();


        return parseInventoryCSV(
            text
        );
    }


    throw new Error(
        "Only CSV and XLSX files are supported."
    );
}


function validateImportRows(
    rows
) {

    const validRows = [];

    const errors = [];


    rows.forEach(
        row => {

            const rowErrors =
                [];


            if (
                !row.project
            ) {

                rowErrors.push(
                    "Project is required"
                );
            }


            if (
                !row.item
            ) {

                rowErrors.push(
                    "Item is required"
                );
            }


            if (
                row.rate < 0
            ) {

                rowErrors.push(
                    "Rate cannot be negative"
                );
            }


            if (
                row.demand < 0
            ) {

                rowErrors.push(
                    "Demand cannot be negative"
                );
            }


            if (
                row.received < 0
            ) {

                rowErrors.push(
                    "Received cannot be negative"
                );
            }


            if (
                rowErrors.length
            ) {

                errors.push({

                    row:
                        row.rowNumber,

                    messages:
                        rowErrors
                });

            } else {

                validRows.push(
                    row
                );
            }
        }
    );


    return {
        validRows,
        errors
    };
}


async function handleCSVImport(
    file
) {

    if (
        !canManageInventory()
    ) {

        alert(
            "You do not have permission to import inventory."
        );

        return;
    }


    try {

        const parsedRows =
            await readInventoryImportFile(
                file
            );


        const {
            validRows,
            errors
        } =
            validateImportRows(
                parsedRows
            );


        if (
            errors.length
        ) {

            const message =
                errors
                    .slice(
                        0,
                        10
                    )
                    .map(
                        error =>
                            `Row ${error.row}: ${error.messages.join(", ")}`
                    )
                    .join("\n");


            alert(
                `Import validation failed.\n\n${message}`
            );

            return;
        }


        if (
            !validRows.length
        ) {

            alert(
                "No valid inventory rows were found."
            );

            return;
        }


        const confirmed =
            confirm(
                `Import ${validRows.length} inventory rows?`
            );


        if (!confirmed) {
            return;
        }


        const response =
            await fetch(
                `${API_URL}/inventory/import`,
                {

                    method:
                        "POST",

                    headers:
                        authHeaders(true),

                    body:
                        JSON.stringify({
                            rows:
                                validRows
                        })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (
            !response.ok
        ) {

            alert(
                data.message ||
                `Import failed. Status ${response.status}`
            );

            return;
        }


        await loadRecords();


        if (
            getRole() === "admin"
        ) {

            await loadAuditLogs()
                .catch(() => {});
        }


        renderAll();


        alert(
            `${data.imported} inventory rows imported successfully.`
        );


    } catch (error) {

        console.error(
            "IMPORT ERROR:",
            error
        );

        alert(
            error.message ||
            "Unable to import file."
        );
    }
}


// =================================================
// ================= EXPORT =========================
// =================================================

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
                availableQuantity(
                    record
                ),
                record.remarks
            ]
                .map(
                    value =>
                        `"${String(
                            value ?? ""
                        ).replace(
                            /"/g,
                            '""'
                        )}"`
                )
                .join(",");


            csv +=
                "\n";
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


    link.href =
        url;


    link.download =
        "inventory.csv";


    link.click();


    URL.revokeObjectURL(
        url
    );
}


// =================================================
// ================= ATTACHMENTS ===================
// =================================================

function selectAttachment(
    id
) {

    attachmentInventoryId =
        id;


    const input =
        document.getElementById(
            "attachmentInput"
        );


    if (input) {

        input.click();
    }
}


async function viewAttachments(
    inventoryId
) {

    try {

        const response =
            await fetch(
                `${API_URL}/inventory/${inventoryId}/attachments`,
                {
                    headers:
                        authHeaders()
                }
            );


        const data =
            await response
                .json()
                .catch(() => []);


        if (
            !response.ok
        ) {

            alert(
                data.message ||
                "Failed to load attachments."
            );

            return;
        }


        const viewer =
            document.getElementById(
                "attachmentViewer"
            );


        const list =
            document.getElementById(
                "attachmentList"
            );


        if (
            !viewer ||
            !list
        ) {

            return;
        }


        if (
            !data.length
        ) {

            list.innerHTML =
                "<p>No attachments found.</p>";

        } else {

            list.innerHTML =
                data.map(
                    file => {

                        const url =
                            `http://localhost:5000${file.file_path}`;


                        const fileName =
                            String(
                                file.file_name ||
                                ""
                            );


                        const extension =
                            fileName
                                .split(".")
                                .pop()
                                .toLowerCase();


                        const isImage =
                            [
                                "jpg",
                                "jpeg",
                                "png",
                                "webp"
                            ].includes(
                                extension
                            );


                        return `

                            <div class="attachment-item">

                                <div>
                                    ${escapeHtml(
                                        file.file_name
                                    )}
                                </div>


                                ${
                                    isImage
                                        ? `
                                            <div class="attachment-preview">

                                                <img
                                                    src="${url}"
                                                    alt="${escapeHtml(
                                                        file.file_name
                                                    )}"
                                                >

                                            </div>
                                        `
                                        : ""
                                }


                                <a
                                    href="${url}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Open File
                                </a>

                            </div>

                        `;
                    }
                )
                .join("");
        }


        viewer.classList.add(
            "open"
        );


    } catch (error) {

        console.error(
            "VIEW ATTACHMENTS ERROR:",
            error
        );

        alert(
            "Unable to load attachments."
        );
    }
}


// =================================================
// ================= TABS ==========================
// =================================================

function switchTab(
    tab
) {

    activeTab =
        tab;


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


    const ledgerPanel =
        document.getElementById(
            "tab-ledger"
        );


    const dashboardPanel =
        document.getElementById(
            "tab-dashboard"
        );


    const checkoutPanel =
        document.getElementById(
            "tab-checkouts"
        );


    const auditPanel =
        document.getElementById(
            "tab-audit"
        );


    const usersPanel =
        document.getElementById(
            "tab-users"
        );


    if (ledgerPanel) {

        ledgerPanel.style.display =
            tab === "ledger"
                ? "flex"
                : "none";
    }


    if (dashboardPanel) {

        dashboardPanel.style.display =
            tab === "dashboard"
                ? "block"
                : "none";
    }


    if (checkoutPanel) {

        checkoutPanel.style.display =
            tab === "checkouts"
                ? "block"
                : "none";
    }


    if (auditPanel) {

        auditPanel.style.display =
            tab === "audit"
                ? "block"
                : "none";
    }


    if (usersPanel) {

        usersPanel.style.display =
            tab === "users"
                ? "block"
                : "none";
    }
}


// =================================================
// ================= RENDER ALL ====================
// =================================================

function renderAll() {

    renderLedger();

    renderDashboard();

    renderCheckouts();

    renderAuditLogs();

    renderUsers();
}


// =================================================
// ================= INITIALIZE ====================
// =================================================

async function init() {

    try {

        await loadProjects();

        await loadRecords();

        await loadCheckouts();


        await loadDashboardProjects();


        if (
            getRole() ===
            "admin"
        ) {

            await loadAuditLogs();

            await loadUsers();
        }


        renderAll();


        switchTab(
            "ledger"
        );


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


// =================================================
// ================= EVENTS ========================
// =================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        // ================= USER INFO =================

        document
            .getElementById(
                "userInfo"
            )
            ?.append(
                `${user.username} (${user.role})`
            );


        // ================= ADMIN TAB VISIBILITY =================

        const auditTabBtn =
            document.getElementById(
                "auditTabBtn"
            );


        const usersTabBtn =
            document.getElementById(
                "usersTabBtn"
            );


        if (
            getRole() ===
            "admin"
        ) {

            if (
                auditTabBtn
            ) {

                auditTabBtn.style.display =
                    "inline-block";
            }


            if (
                usersTabBtn
            ) {

                usersTabBtn.style.display =
                    "inline-block";
            }

        } else {

            if (
                auditTabBtn
            ) {

                auditTabBtn.style.display =
                    "none";
            }


            if (
                usersTabBtn
            ) {

                usersTabBtn.style.display =
                    "none";
            }
        }


        // ================= SEARCH =================

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


        // ================= DASHBOARD FILTER =================

        document
            .getElementById(
                "dashboard-project"
            )
            ?.addEventListener(
                "change",
                function () {

                    dashProject =
                        this.value;

                    renderDashboard();
                }
            );


        // ================= ADD INVENTORY =================

        document
            .getElementById(
                "addRowBtn"
            )
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    if (
                        !canManageInventory()
                    ) {

                        alert(
                            "You do not have permission to add inventory."
                        );

                        return;
                    }

                    openInventoryForm();
                }
            );


        document
            .getElementById(
                "bottomAddRowBtn"
            )
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    if (
                        !canManageInventory()
                    ) {

                        alert(
                            "You do not have permission to add inventory."
                        );

                        return;
                    }

                    openInventoryForm();
                }
            );


        // ================= INVENTORY FORM =================

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


        // ================= PROJECTS =================

        document
            .getElementById(
                "manageProjectsBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    const panel =
                        document.getElementById(
                            "projectPanel"
                        );


                    if (panel) {

                        panel.style.display =
                            "block";
                    }
                }
            );


        document
            .getElementById(
                "closeProjectsBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    const panel =
                        document.getElementById(
                            "projectPanel"
                        );


                    if (panel) {

                        panel.style.display =
                            "none";
                    }
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


        // ================= EXPORT =================

        document
            .getElementById(
                "exportBtn"
            )
            ?.addEventListener(
                "click",
                exportCSV
            );


        // ================= IMPORT =================

        document
            .getElementById(
                "importBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    if (
                        !canManageInventory()
                    ) {

                        alert(
                            "You do not have permission to import inventory."
                        );

                        return;
                    }


                    document
                        .getElementById(
                            "csvFileInput"
                        )
                        ?.click();
                }
            );


        document
            .getElementById(
                "csvFileInput"
            )
            ?.addEventListener(
                "change",
                async function () {

                    const file =
                        this.files?.[0];


                    if (!file) {
                        return;
                    }


                    await handleCSVImport(
                        file
                    );


                    this.value =
                        "";
                }
            );


        // ================= ATTACHMENT INPUT =================

        document
            .getElementById(
                "attachmentInput"
            )
            ?.addEventListener(
                "change",
                async function () {

                    const file =
                        this.files?.[0];


                    if (
                        !file ||
                        !attachmentInventoryId
                    ) {

                        return;
                    }


                    const formData =
                        new FormData();


                    formData.append(
                        "attachment",
                        file
                    );


                    try {

                        const response =
                            await fetch(
                                `${API_URL}/inventory/${attachmentInventoryId}/attachments`,
                                {

                                    method:
                                        "POST",

                                    headers: {

                                        Authorization:
                                            `Bearer ${localStorage.getItem("token")}`

                                    },

                                    body:
                                        formData
                                }
                            );


                        const data =
                            await response
                                .json()
                                .catch(
                                    () => ({})
                                );


                        if (
                            !response.ok
                        ) {

                            alert(
                                data.message ||
                                "Attachment upload failed."
                            );

                            return;
                        }


                        alert(
                            "Attachment uploaded successfully."
                        );


                        this.value =
                            "";


                        attachmentInventoryId =
                            null;


                        if (
                            getRole() ===
                            "admin"
                        ) {

                            await loadAuditLogs()
                                .catch(
                                    () => {}
                                );
                        }


                        renderAuditLogs();


                    } catch (error) {

                        console.error(
                            "ATTACHMENT UPLOAD ERROR:",
                            error
                        );

                        alert(
                            "Unable to upload attachment."
                        );
                    }
                }
            );


        // ================= ATTACHMENT VIEWER =================

        document
            .getElementById(
                "closeAttachmentViewer"
            )
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const viewer =
                        document.getElementById(
                            "attachmentViewer"
                        );


                    if (viewer) {

                        viewer.classList.remove(
                            "open"
                        );
                    }
                }
            );


        document
            .getElementById(
                "attachmentViewer"
            )
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        event.currentTarget
                    ) {

                        event
                            .currentTarget
                            .classList
                            .remove(
                                "open"
                            );
                    }
                }
            );


        // ================= LEDGER BUTTONS =================

        document
            .getElementById(
                "ledgerBody"
            )
            ?.addEventListener(
                "click",
                event => {

                    const target =
                        event.target.closest(
                            "button"
                        );


                    if (!target) {
                        return;
                    }


                    if (
                        target.dataset
                            .attachment
                    ) {

                        selectAttachment(
                            target.dataset
                                .attachment
                        );

                        return;
                    }


                    if (
                        target.dataset
                            .viewAttachments
                    ) {

                        viewAttachments(
                            target.dataset
                                .viewAttachments
                        );

                        return;
                    }


                    if (
                        target.dataset
                            .delete
                    ) {

                        deleteInventory(
                            target.dataset
                                .delete
                        );

                        return;
                    }


                    if (
                        target.dataset
                            .checkout
                    ) {

                        openCheckout(
                            target.dataset
                                .checkout
                        );
                    }
                }
            );


        // ================= INLINE EDITING =================

        document
            .getElementById(
                "ledgerBody"
            )
            ?.addEventListener(
                "dblclick",
                event => {

                    if (
                        !canEdit
                    ) {

                        return;
                    }


                    const cell =
                        event.target.closest(
                            "td.editable"
                        );


                    if (!cell) {
                        return;
                    }


                    if (
                        cell.querySelector(
                            "input, select"
                        )
                    ) {

                        return;
                    }


                    const row =
                        cell.closest(
                            "tr"
                        );


                    if (!row) {
                        return;
                    }


                    const id =
                        row.dataset.id;


                    const field =
                        cell.dataset.field;


                    const record =
                        records.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );


                    if (!record) {
                        return;
                    }


                    const oldValue =
                        record[field] ??
                        "";


                    // PROJECT

                    if (
                        field ===
                        "project"
                    ) {

                        const select =
                            document.createElement(
                                "select"
                            );


                        select.className =
                            "cell-select";


                        select.innerHTML =
                            `
                                <option value="">
                                    Select Project
                                </option>
                            `;


                        projects.forEach(
                            project => {

                                const option =
                                    document.createElement(
                                        "option"
                                    );


                                option.value =
                                    project.name;


                                option.textContent =
                                    project.name;


                                if (
                                    project.name ===
                                    oldValue
                                ) {

                                    option.selected =
                                        true;
                                }


                                select.appendChild(
                                    option
                                );
                            }
                        );


                        cell.innerHTML =
                            "";


                        cell.appendChild(
                            select
                        );


                        select.focus();


                        let saved =
                            false;


                        async function saveProject() {

                            if (
                                saved
                            ) {

                                return;
                            }


                            saved =
                                true;


                            const newValue =
                                select.value.trim();


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


                    // NUMBERS

                    if (
                        field === "rate" ||
                        field === "demand" ||
                        field === "received"
                    ) {

                        const input =
                            document.createElement(
                                "input"
                            );


                        input.type =
                            "number";


                        input.className =
                            "cell-input";


                        input.value =
                            oldValue;


                        cell.innerHTML =
                            "";


                        cell.appendChild(
                            input
                        );


                        input.focus();

                        input.select();


                        let saved =
                            false;


                        async function saveNumber() {

                            if (
                                saved
                            ) {

                                return;
                            }


                            saved =
                                true;


                            const newValue =
                                Number(
                                    input.value
                                ) || 0;


                            if (
                                newValue ===
                                Number(oldValue)
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
                            {
                                once:
                                    true
                            }
                        );


                        input.addEventListener(
                            "keydown",
                            event => {

                                if (
                                    event.key ===
                                    "Enter"
                                ) {

                                    input.blur();
                                }


                                if (
                                    event.key ===
                                    "Escape"
                                ) {

                                    renderLedger();
                                }
                            }
                        );


                        return;
                    }


                    // NORMAL TEXT

                    const input =
                        document.createElement(
                            "input"
                        );


                    input.type =
                        "text";


                    input.className =
                        "cell-input";


                    input.value =
                        oldValue;


                    cell.innerHTML =
                        "";


                    cell.appendChild(
                        input
                    );


                    input.focus();

                    input.select();


                    let saved =
                        false;


                    async function saveText() {

                        if (
                            saved
                        ) {

                            return;
                        }


                        saved =
                            true;


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
                        saveText,
                        {
                            once:
                                true
                        }
                    );


                    input.addEventListener(
                        "keydown",
                        event => {

                            if (
                                event.key ===
                                "Enter"
                            ) {

                                input.blur();
                            }


                            if (
                                event.key ===
                                "Escape"
                            ) {

                                renderLedger();
                            }
                        }
                    );
                }
            );


        // ================= CHECKOUT BUTTONS =================

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


        // ================= USER MANAGEMENT =================

        document
            .getElementById(
                "showAddUserBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    const panel =
                        document.getElementById(
                            "addUserPanel"
                        );


                    if (panel) {

                        panel.style.display =
                            "block";
                    }
                }
            );


        document
            .getElementById(
                "cancelAddUserBtn"
            )
            ?.addEventListener(
                "click",
                () => {

                    const panel =
                        document.getElementById(
                            "addUserPanel"
                        );


                    if (panel) {

                        panel.style.display =
                            "none";
                    }
                }
            );


        document
            .getElementById(
                "createUserBtn"
            )
            ?.addEventListener(
                "click",
                createUser
            );


        document
            .getElementById(
                "userRoleFilter"
            )
            ?.addEventListener(
                "change",
                renderUsers
            );


        document
            .getElementById(
                "usersBody"
            )
            ?.addEventListener(
                "change",
                event => {

                    const select =
                        event.target.closest(
                            "[data-user-role]"
                        );


                    if (!select) {
                        return;
                    }


                    changeUserRole(
                        select.dataset
                            .userRole,
                        select.value
                    );
                }
            );


        document
            .getElementById(
                "usersBody"
            )
            ?.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            "button"
                        );


                    if (!button) {
                        return;
                    }


                    if (
                        button.dataset
                            .userStatus
                    ) {

                        changeUserStatus(
                            button.dataset
                                .userStatus,
                            button.dataset
                                .active
                        );

                        return;
                    }


                    if (
                        button.dataset
                            .resetPassword
                    ) {

                        resetUserPassword(
                            button.dataset
                                .resetPassword
                        );
                    }
                }
            );


        // ================= TAB BUTTONS =================

        document
            .querySelectorAll(
                ".tabbar button"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const tab =
                                button.dataset.tab;


                            try {

                                if (
                                    tab === "audit" &&
                                    getRole() ===
                                    "admin"
                                ) {

                                    await loadAuditLogs();

                                    renderAuditLogs();
                                }


                                if (
                                    tab === "users" &&
                                    getRole() ===
                                    "admin"
                                ) {

                                    await loadUsers();

                                    renderUsers();
                                }


                            } catch (error) {

                                console.error(
                                    "TAB LOAD ERROR:",
                                    error
                                );
                            }


                            switchTab(
                                tab
                            );
                        }
                    );
                }
            );


        // ================= PERMISSION VISIBILITY =================

        if (
            !canManageInventory()
        ) {

            const ids = [

                "bottomAddRowBtn",
                "addRowBtn",
                "manageProjectsBtn",
                "importBtn"

            ];


            ids.forEach(
                id => {

                    const element =
                        document.getElementById(
                            id
                        );


                    if (element) {

                        element.style.display =
                            "none";
                    }
                }
            );
        }


        // ================= LOGOUT =================

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


        // ================= START APP =================

        init();
    }
);