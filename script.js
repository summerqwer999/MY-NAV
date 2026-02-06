// ====== 配置区 ======
const API_URL = 'mynavdata.summerqwer999.workers.dev/api/config'; 
const ADMIN_PASS = '226688'; 
// ===================

let links = [];
let wallpaper = '';
let isLogged = false;

async function init() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        links = data.links || [];
        wallpaper = data.wallpaper || '';
        document.getElementById('wp-input').value = wallpaper;
        render();
    } catch (e) { console.error("加载失败", e); }
}

function render() {
    document.getElementById('bg-layer').style.backgroundImage = `url(${wallpaper})`;
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';

    if (isLogged) {
        // 编辑模式：列表排布
        grid.style.display = 'block';
        links.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'glass-card';
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <input onchange="update(${index},'category',this.value)" value="${item.category || '默认'}" placeholder="分类">
                    <input onchange="update(${index},'title',this.value)" value="${item.title}" placeholder="名称">
                    <input onchange="update(${index},'url',this.value)" value="${item.url}" placeholder="网址">
                    <button onclick="del(${index})" style="background:#ff4d4d; color:white; margin-top:5px;">删除此项</button>
                </div>`;
            grid.appendChild(div);
        });
    } else {
        // 展示模式：分组渲染
        grid.style.display = 'block';
        const categories = [...new Set(links.map(item => item.category || '默认'))];
        categories.forEach(cat => {
            const section = document.createElement('div');
            section.className = 'category-group';
            section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid"></div>`;
            const catGrid = section.querySelector('.cat-grid');
            
            links.filter(item => (item.category || '默认') === cat).forEach(item => {
                const card = document.createElement('div');
                card.className = 'glass-card card';
                card.innerHTML = `
                    <a href="${item.url}" target="_blank">
                        <img src="https://favicon.t4tt.strangled.net/png?url=${item.url}">
                        <div>${item.title}</div>
                    </a>`;
                catGrid.appendChild(card);
            });
            grid.appendChild(section);
        });
    }
}

function showModal() { document.getElementById('login-modal').style.display = 'flex'; }
function hideModal() { document.getElementById('login-modal').style.display = 'none'; }

function login() {
    const input = document.getElementById('pass-input').value;
    if (input === ADMIN_PASS) {
        isLogged = true;
        hideModal();
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('admin-actions').style.display = 'flex';
        document.getElementById('bg-edit-bar').style.display = 'block';
        render();
    } else { alert('密码错误'); }
}

function update(i, field, val) { links[i][field] = val; }
function del(i) { links.splice(i, 1); render(); }
function addCard() { links.push({title: '新站点', url: 'https://', category: '常用'}); render(); }

async function saveAll() {
    const newWallpaper = document.getElementById('wp-input').value;
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_PASS}` },
        body: JSON.stringify({ links, wallpaper: newWallpaper })
    });
    if (res.ok) { alert('同步成功！'); location.reload(); }
}

init();
