
(function(){

  const API_URL = 'http://192.168.8.188:5000/api';

    let records = [];
    let projects = [];
    let activeTab = 'ledger';
    let dashProject = '';


  /* ================= BASIC FUNCTIONS ================= */

  const uid = () =>
    'r' +
    Math.random().toString(36).slice(2,10) +
    Date.now().toString(36);


  const todayStr = () =>
    new Date().toISOString().slice(0,10);


  const money = (n) =>
    '₨' +
    Math.round(n).toLocaleString('en-PK');


  const num = (n) =>
    (
      Math.round(
        (n + Number.EPSILON) * 100
      ) / 100
    ).toLocaleString('en-PK');


  /* ================= SAMPLE DATA ================= */

  const SEED = [

    {
      project:'Faisal Heights',
      item:'Steel',
      grade:'#4',
      po:'PO-3100',
      unit:'Tons',
      rate:216000,
      demand:258,
      received:180,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Heights',
      item:'Cement',
      grade:'OPC 50kg',
      po:'PO-3101',
      unit:'Bag',
      rate:1450,
      demand:5000,
      received:3200,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Heights',
      item:'Sand',
      grade:'Fine',
      po:'PO-3101',
      unit:'Cum',
      rate:6800,
      demand:450,
      received:300,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Heights',
      item:'Scaffolding',
      grade:'Standard',
      po:'PO-3102',
      unit:'Nos',
      rate:9500,
      demand:650,
      received:500,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Heights',
      item:'DB Panel',
      grade:'12 Way',
      po:'PO-3103',
      unit:'Nos',
      rate:48000,
      demand:30,
      received:18,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Heights',
      item:'Safety Helmet',
      grade:'Standard',
      po:'PO-3104',
      unit:'Nos',
      rate:1250,
      demand:250,
      received:200,
      updated:'2026-08-17',
      remarks:'Reorder needed'
    },

    {
      project:'Faisal Jewel',
      item:'Steel',
      grade:'#4',
      po:'PO-3200',
      unit:'Tons',
      rate:224640,
      demand:278.64,
      received:194.4,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Jewel',
      item:'Cement',
      grade:'OPC 50kg',
      po:'PO-3201',
      unit:'Bag',
      rate:1508,
      demand:5400,
      received:3456,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Jewel',
      item:'Brick',
      grade:'A Class',
      po:'PO-3202',
      unit:'Nos',
      rate:29.12,
      demand:27000,
      received:17280,
      updated:'2026-08-17',
      remarks:'Template sample'
    },

    {
      project:'Faisal Jewel',
      item:'Angle Grinder',
      grade:'5 inch',
      po:'PO-3204',
      unit:'Nos',
      rate:18500,
      demand:25,
      received:18,
      updated:'2026-08-17',
      remarks:'Fully deployed to crews'
    }

  ].map(r => ({
    id:uid(),
    ...r
  }));


  /* ================= COST ================= */

  function computeCost(r){

    return (
      Number(r.rate) || 0
    ) * (
      Number(r.received) || 0
    );

  }


  /* ================= LOAD RECORDS ================= */

  async function loadRecords() {
    try {
        console.log('Loading inventory from MySQL...');

        const response = await fetch(
            'http://localhost:5000/api/inventory'
        );

        console.log('Server response:', response.status);

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data = await response.json();

        console.log('Inventory received:', data);

        records = data.map(record => ({
            id: Number(record.id),
            project: record.project || '',
            item: record.item || '',
            grade: record.grade || '',
            po: record.po || '',
            unit: record.unit || '',
            rate: Number(record.rate) || 0,
            demand: Number(record.demand) || 0,
            received: Number(record.received) || 0,
            updated: record.updated
                ? record.updated.slice(0, 10)
                : '',
            remarks: record.remarks || ''
        }));

        console.log(
            'Inventory loaded successfully:',
            records
        );

    } catch (error) {

        console.error(
            'Inventory loading error:',
            error
        );

        alert(
            'Unable to load inventory from server. Check the browser console.'
        );
    }
}


  /* ================= SAVE RECORDS ================= */

  
  /* ================= PROJECTS ================= */

  async function loadProjects() {
    try {

        const response =
            await fetch(`${API_URL}/projects`);

        if (!response.ok) {
            throw new Error('Failed to load projects');
        }

        const data =
            await response.json();

        projects =
            data.map(p => p.name);

        console.log(
            'Projects loaded from MySQL:',
            projects
        );

    } catch (error) {

        console.error(
            'Failed to load projects:',
            error
        );

        alert(
            'Unable to load projects from the server.'
        );
    }
}


  
  function uniqueProjects(){

    const fromRecords =
      records
      .map(r => r.project)
      .filter(Boolean);


    return [
      ...new Set([
        ...projects,
        ...fromRecords
      ])
    ].sort();

  }


  async function addProject(name) {

    name = name.trim();

    if (!name) {
        return;
    }

    try {

        const response =
            await fetch(`${API_URL}/projects`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    name: name
                })
            });

        const data =
            await response.json();

        if (!response.ok) {
            alert(data.message || 'Failed to add project');
            return;
        }

        projects.push(name);

        projects.sort();

        renderAll();

    } catch (error) {

        console.error(
            'Failed to add project:',
            error
        );

        alert(
            'Unable to connect to the backend server.'
        );
    }
}


  async function removeProject(name) {

    const inUse =
        records.some(
            r => r.project === name
        );

    if (inUse) {

        alert(
            `Can't remove "${name}" — it still has ledger entries. Delete or reassign those items first.`
        );

        return;
    }

    if (!confirm(`Remove project "${name}"?`)) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/projects/${encodeURIComponent(name)}`,
                {
                    method: 'DELETE'
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                'Failed to remove project'
            );

            return;
        }

        projects =
            projects.filter(
                p => p !== name
            );

        renderAll();

    } catch (error) {

        console.error(
            'Failed to remove project:',
            error
        );

        alert(
            'Unable to connect to the backend server.'
        );
    }
}
async function saveRecordToDatabase(record) {

    try {

        const response = await fetch(
            `http://localhost:5000/api/inventory/${record.id}`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(record)
            }
        );

        if (!response.ok) {
            throw new Error('Save failed');
        }

        console.log(
            'Saved to MySQL:',
            record
        );

    } catch (error) {

        console.error(
            'MySQL save error:',
            error
        );

        alert('Could not save changes.');
    }
}
async function deleteRecordFromDatabase(id) {

    try {

        const response =
            await fetch(
                `${API_URL}/inventory/${id}`,
                {
                    method: 'DELETE'
                }
            );

        if (!response.ok) {
            throw new Error(
                'Failed to delete record'
            );
        }

        records =
            records.filter(
                r => r.id !== id
            );

        renderAll();

    } catch (error) {

        console.error(
            'Failed to delete record:',
            error
        );

        alert(
            'Unable to delete record from database.'
        );
    }
}
  /* ================= ESCAPE HTML ================= */

  function escapeHtml(s){

    return String(s ?? '')
      .replace(
        /[&<>"']/g,
        c => ({
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        }[c])
      );

  }


  /* ================= AUTO CELL WIDTH ================= */

  const _measureCanvas =
    document.createElement('canvas');

  const _measureCtx =
    _measureCanvas.getContext('2d');


  function textWidthPx(
    text,
    font
  ){

    _measureCtx.font = font;

    return _measureCtx.measureText(
      text || ''
    ).width;

  }


  function autoSizeCell(el){

    const cs =
      getComputedStyle(el);


    const font =
      `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;


    let text;


    if(el.tagName === 'SELECT'){

      text =
        el.options[
          el.selectedIndex
        ]
        ?
        el.options[
          el.selectedIndex
        ].text
        :
        '';

    }else{

      text =
        el.value ||
        el.placeholder ||
        '';

    }


    const measured =
      textWidthPx(
        text,
        font
      );


    const BUFFER = 12;

    const MIN =
      el.classList.contains(
        'cell-narrow'
      )
      ?
      40
      :
      35;


    const MAX =
      el.classList.contains(
        'cell-remarks'
      )
      ?
      250
      :
      180;


    el.style.width =
      Math.min(
        MAX,
        Math.max(
          MIN,
          Math.round(
            measured + BUFFER
          )
        )
      ) + 'px';

  }


  function autoSizeAllCells(root){

    root
      .querySelectorAll(
        '.cell-input, .cell-select'
      )
      .forEach(
        autoSizeCell
      );

  }


  /* ================= PROJECT FILTER ================= */

  function renderProjectFilterOptions(){

    const sel =
      document.getElementById(
        'f-project'
      );


    const current =
      sel.value;


    sel.innerHTML =
      '<option value="">All Projects</option>' +

      uniqueProjects()
        .map(
          p =>
          `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`
        )
        .join('');


    sel.value = current;

  }


  /* ================= MANAGE PROJECTS ================= */

  function renderManageProjectsPanel(){

    const wrap =
      document.getElementById(
        'projectChipsManage'
      );


    const list =
      uniqueProjects();


    if(list.length === 0){

      wrap.innerHTML =
        '<p style="font-family:Arial, Helvetica, sans-serif;font-size:12px;color:var(--steel);">No projects yet — add your first one above.</p>';

      return;

    }


    wrap.innerHTML =
      list
      .map(
        p => `
          <span
            class="chip"
            style="display:inline-flex;align-items:center;gap:8px;cursor:default;"
          >

            ${escapeHtml(p)}

            <button
              class="del"
              data-project="${escapeHtml(p)}"
              style="
                background:none;
                border:none;
                color:var(--rebar);
                cursor:pointer;
                font-family:Arial, Helvetica, sans-serif;
                font-size:13px;
              "
            >
              ×
            </button>

          </span>
        `
      )
      .join('');


    wrap
      .querySelectorAll(
        'button.del'
      )
      .forEach(
        btn =>
        btn.addEventListener(
          'click',
          () =>
          removeProject(
            btn.dataset.project
          )
        )
      );

  }


  /* ================= FILTER LEDGER ================= */

  function filteredLedgerRecords(){

    const search =
      document
      .getElementById(
        'f-search'
      )
      .value
      .trim()
      .toLowerCase();


    const proj =
      document.getElementById(
        'f-project'
      ).value;


    return records.filter(r => {

      if(
        proj &&
        r.project !== proj
      )
        return false;


      if(search){

        const hay =
          [
            r.project,
            r.item,
            r.grade,
            r.po,
            r.remarks
          ]
          .join(' ')
          .toLowerCase();


        if(
          !hay.includes(search)
        )
          return false;

      }


      return true;

    });

  }


  /* ================= PROJECT OPTIONS ================= */

  function projectOptionsHtml(
    selected
  ){

    return uniqueProjects()
      .map(
        p =>
        `<option
          value="${escapeHtml(p)}"
          ${p === selected ? 'selected' : ''}
        >
          ${escapeHtml(p)}
        </option>`
      )
      .join('');

  }


  /* ================= RENDER LEDGER ================= */

  function renderLedger(){

    renderProjectFilterOptions();


    const rows =
      filteredLedgerRecords();


    const body =
      document.getElementById(
        'ledgerBody'
      );


    document.getElementById(
      'emptyState'
    ).style.display =
      rows.length
      ?
      'none'
      :
      'block';


    body.innerHTML =
      rows
      .map(r => {

        const cost =
          computeCost(r);


        return `

          <tr data-id="${r.id}">

            <td>
              <select
                class="cell-select"
                data-field="project"
              >
                ${projectOptionsHtml(r.project)}
              </select>
            </td>


            <td>
              <input
                class="cell-input"
                type="text"
                data-field="item"
                value="${escapeHtml(r.item)}"
              >
            </td>


            <td>
              <input
                class="cell-input"
                type="text"
                data-field="grade"
                value="${escapeHtml(r.grade)}"
              >
            </td>


            <td>
              <input
                class="cell-input"
                type="text"
                data-field="po"
                value="${escapeHtml(r.po)}"
              >
            </td>


            <td>
              <input
                class="cell-input cell-narrow"
                type="text"
                data-field="unit"
                value="${escapeHtml(r.unit)}"
              >
            </td>


            <td>
              <input
                class="cell-input cell-narrow"
                type="number"
                step="0.01"
                min="0"
                data-field="rate"
                value="${r.rate}"
              >
            </td>


            <td>
              <input
                class="cell-input cell-narrow"
                type="number"
                step="0.01"
                min="0"
                data-field="demand"
                value="${r.demand}"
              >
            </td>


            <td>
              <input
                class="cell-input cell-narrow"
                type="number"
                step="0.01"
                min="0"
                data-field="received"
                value="${r.received}"
              >
            </td>


            <td
              class="cost-cell"
              data-cost-for="${r.id}"
            >
              ${money(cost)}
            </td>


            <td class="updated-cell">
              ${r.updated || ''}
            </td>


            <td>
              <input
                class="cell-input cell-remarks"
                type="text"
                data-field="remarks"
                value="${escapeHtml(r.remarks || '')}"
              >
            </td>


            <td>

              <div class="rowbtns">

                <button class="del">
                  Delete
                </button>

              </div>

            </td>

          </tr>

        `;

      })
      .join('');


    document.getElementById(
      'recordCountStamp'
    ).textContent =
      `${records.length} ITEM${records.length === 1 ? '' : 'S'} ON RECORD`;


    autoSizeAllCells(body);


    body
      .querySelectorAll(
        'button.del'
      )
      .forEach(
        btn => {

          btn.addEventListener(
            'click',
            e => {

              const id =
                e.target
                .closest('tr')
                .dataset.id;


              if(
                confirm(
                  'Delete this ledger entry?'
                )
              ){

                deleteRecordFromDatabase(id);

              }

            }
          );

        }
      );

  }


  /* ================= FIND RECORD ================= */

  function findRecord(id){
    return records.find(
        r => String(r.id) === String(id)
    );
}
  

  /* ================= LIVE INPUT ================= */

  document
    .getElementById(
      'ledgerBody'
    )
    .addEventListener(
      'input',
       e => {

        const target =
          e.target;


        if(
          !target.dataset.field
        )
          return;


        const tr =
          target.closest('tr');


        const id =
          tr.dataset.id;


        const r =
          findRecord(id);


        if(!r)
          return;


        const field =
          target.dataset.field;


        const numericFields =
          [
            'rate',
            'demand',
            'received'
          ];


        r[field] =
          numericFields.includes(field)
          ?
          (Number(target.value) || 0)
          :
          target.value;


        if(
          field === 'rate' ||
          field === 'received'
        ){

          const costCell =
            tr.querySelector(
              `.cost-cell[data-cost-for="${id}"]`
            );


          if(costCell)
            costCell.textContent =
              money(
                computeCost(r)
              );

        }


        autoSizeCell(target);

      }
    );


  /* ================= COMMIT CHANGES ================= */

  document
    .getElementById('ledgerBody')
    .addEventListener('change', async e => {

        console.log('CHANGE EVENT FIRED');

        const target = e.target;

        console.log('Changed element:', target);

        if (
            target.matches('.cell-input, .cell-select')
        ) {
            autoSizeCell(target);
        }

        if (!target.dataset.field) {
            console.log('No data-field found');
            return;
        }

        const tr = target.closest('tr');

        if (!tr) {
            console.log('No table row found');
            return;
        }

        const id = tr.dataset.id;

        console.log('Record ID:', id);

        const r = findRecord(id);

        if (!r) {
            console.log('Record not found:', id);
            return;
        }

        const field = target.dataset.field;

        const numericFields = [
            'rate',
            'demand',
            'received'
        ];

        r[field] = numericFields.includes(field)
            ? (Number(target.value) || 0)
            : target.value;

        r.updated = todayStr();

        console.log('Updated local record:', r);

        await saveRecordToDatabase(r);

        renderAll();
    });

  /* ================= ADD ROW ================= */

  async function addRow() {

    const projList = uniqueProjects();

    if (projList.length === 0) {
        alert('Add a project first.');
        openProjectPanel();
        return;
    }

    const proj =
        document.getElementById('f-project').value ||
        projList[0];

    const newRecord = {
        project: proj,
        item: '',
        grade: '',
        po: '',
        unit: '',
        rate: 0,
        demand: 0,
        received: 0,
        remarks: '',
        updated: todayStr()
    };

    try {

        const response = await fetch(
            'http://localhost:5000/api/inventory',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(newRecord)
            }
        );

        if (!response.ok) {
            throw new Error('Could not save record');
        }

        const data = await response.json();

        newRecord.id = data.id;

        records.push(newRecord);

        renderAll();

        console.log('Saved to MySQL:', newRecord);

    } catch (error) {

        console.error(error);

        alert('Could not save record to MySQL.');
    }
}

  /* ================= PROJECT PANEL ================= */

  function openProjectPanel(){

    renderManageProjectsPanel();


    document
      .getElementById(
        'projectPanel'
      )
      .classList
      .add('open');


    document
      .getElementById(
        'in-newproject'
      )
      .focus();

  }


  function closeProjectPanel(){

    document
      .getElementById(
        'projectPanel'
      )
      .classList
      .remove('open');

  }


  /* ========================================================= */
  /* ======================= DASHBOARD ======================= */
  /* ========================================================= */


  function renderProjectChips(){

    const projectsList =
      uniqueProjects();


    const chipBar =
      document.getElementById(
        'projectChips'
      );


    const chips = [

      {
        key:'',
        label:'All Projects'
      },

      ...projectsList.map(
        p => ({
          key:p,
          label:p
        })
      )

    ];


    chipBar.innerHTML =
      chips
      .map(
        c =>
        `
          <button
            class="chip ${dashProject === c.key ? 'active' : ''}"
            data-key="${escapeHtml(c.key)}"
          >
            ${escapeHtml(c.label)}
          </button>
        `
      )
      .join('');


    chipBar
      .querySelectorAll(
        '.chip'
      )
      .forEach(
        btn => {

          btn.addEventListener(
            'click',
            () => {

              dashProject =
                btn.dataset.key;

              renderDashboard();

            }
          );

        }
      );

  }


  function renderDashboard(){

    renderProjectChips();


    const scoped =
      dashProject
      ?
      records.filter(
        r =>
        r.project ===
        dashProject
      )
      :
      records;


    const totalDemand =
      scoped.reduce(
        (s,r) =>
        s +
        (Number(r.demand) || 0),
        0
      );


    const totalReceived =
      scoped.reduce(
        (s,r) =>
        s +
        (Number(r.received) || 0),
        0
      );


    const totalCost =
      scoped.reduce(
        (s,r) =>
        s +
        computeCost(r),
        0
      );


    document.getElementById(
      'statDemand'
    ).textContent =
      num(totalDemand);


    document.getElementById(
      'statReceived'
    ).textContent =
      num(totalReceived);


    document.getElementById(
      'statCost'
    ).textContent =
      money(totalCost);


    /* ================= GROUP ITEMS ================= */

    const groups = {};


    scoped.forEach(r => {

      const key =
        r.item +
        '||' +
        r.grade;


      if(!groups[key]){

        groups[key] = {

          item:r.item,

          grade:r.grade,

          unit:r.unit,

          demand:0,

          received:0,

          cost:0

        };

      }


      const g =
        groups[key];


      g.demand +=
        Number(r.demand) || 0;


      g.received +=
        Number(r.received) || 0;


      g.cost +=
        computeCost(r);

    });


    const rows =
      Object
      .values(groups)
      .sort(
        (a,b) =>
        a.item.localeCompare(
          b.item
        )
      );


    const body =
      document.getElementById(
        'dashBody'
      );


    document.getElementById(
      'dashEmpty'
    ).style.display =
      rows.length
      ?
      'none'
      :
      'block';


    body.innerHTML =
      rows
      .map(
        g =>
        `
          <tr>

            <td>
              ${escapeHtml(g.item)}
            </td>

            <td>
              ${escapeHtml(g.grade)}
            </td>

            <td>
              ${escapeHtml(g.unit)}
            </td>

            <td class="num">
              ${num(g.demand)}
            </td>

            <td class="num">
              ${num(g.received)}
            </td>

            <td class="num">
              ${money(g.cost)}
            </td>

          </tr>
        `
      )
      .join('');

  }


  /* ================= RENDER ALL ================= */

  function renderAll(){

    renderLedger();

    renderDashboard();

  }


  /* ================= EXPORT CSV ================= */

  function exportCsv(){

    const header = [

      'Project',

      'Item',

      'Grade/Size',

      'PO Reference',

      'Unit',

      'Rate',

      'Demand',

      'Received',

      'Cost',

      'Last Updated',

      'Remarks'

    ];


    const lines = [
      header.join(',')
    ];


    records.forEach(r => {

      const row = [

        r.project,

        r.item,

        r.grade,

        r.po,

        r.unit,

        r.rate,

        r.demand,

        r.received,

        computeCost(r),

        r.updated,

        r.remarks

      ]
      .map(
        v =>
        `"${String(v ?? '').replace(/"/g,'""')}"`
      );


      lines.push(
        row.join(',')
      );

    });


    const blob =
      new Blob(
        [
          lines.join('\n')
        ],
        {
          type:'text/csv'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const a =
      document.createElement(
        'a'
      );


    a.href = url;

    a.download =
      'site-inventory-export.csv';


    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

  }


  /* ================= TABS ================= */

  function switchTab(tab){

    activeTab = tab;


    document
      .querySelectorAll(
        '.tabbar button'
      )
      .forEach(
        b =>
        b.classList.toggle(
          'active',
          b.dataset.tab === tab
        )
      );


    document.getElementById(
      'tab-ledger'
    ).style.display =
      tab === 'ledger'
      ?
      'block'
      :
      'none';


    document.getElementById(
      'tab-dashboard'
    ).style.display =
      tab === 'dashboard'
      ?
      'block'
      :
      'none';


    if(
      tab === 'dashboard'
    )
      renderDashboard();

  }


  /* ================= EVENT LISTENERS ================= */

  document
    .querySelectorAll(
      '.tabbar button'
    )
    .forEach(
      b =>
      b.addEventListener(
        'click',
        () =>
        switchTab(
          b.dataset.tab
        )
      )
    );


  document
    .getElementById(
      'addRowBtn'
    )
    .addEventListener(
      'click',
      addRow
    );


  document
    .getElementById(
      'exportBtn'
    )
    .addEventListener(
      'click',
      exportCsv
    );


  document
    .getElementById(
      'manageProjectsBtn'
    )
    .addEventListener(
      'click',
      openProjectPanel
    );


  document
    .getElementById(
      'closeProjectsBtn'
    )
    .addEventListener(
      'click',
      closeProjectPanel
    );


  document
    .getElementById(
      'addProjectBtn'
    )
    .addEventListener(
      'click',
      () => {

        const input =
          document.getElementById(
            'in-newproject'
          );


        addProject(
          input.value
        );


        input.value = '';


        renderManageProjectsPanel();


        input.focus();

      }
    );


  document
    .getElementById(
      'in-newproject'
    )
    .addEventListener(
      'keydown',
      e => {

        if(
          e.key === 'Enter'
        ){

          e.preventDefault();

          document
            .getElementById(
              'addProjectBtn'
            )
            .click();

        }

      }
    );


  document
    .getElementById(
      'f-search'
    )
    .addEventListener(
      'input',
      renderLedger
    );


  document
    .getElementById(
      'f-project'
    )
    .addEventListener(
      'change',
      renderLedger
    );


  /* ================= INITIALIZE ================= */

  (async function init() {

    await loadProjects();

    await loadRecords();

    renderAll();

})();

})();

