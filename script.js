const API_URL = 'mynavdata.summerqwer999.workers.dev/api/config'; 
const ADMIN_PASS = '226688'; 

let links = [];
let wallpaper = '';
let isLogged = false;
let sortables = []; // 存放所有拖拽实例

async function init() {
    const res = await fetch(API_URL);
    const data = await res.json();
    links = data.links || [];
    wallpaper = data.wallpaper || '';
    render();
}

function render() {
    document.getElementById('bg-layer').style.backgroundImage = `url(${wallpaper})`;
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';

    // 获取唯一分类
    const categories = [...new Set(links.map(item => item.category || '默认'))];

    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid" data-category="${cat}"></div>`;
        const catGrid = section.querySelector('.cat-grid');

        links.filter(item => (item.category || '默认') === cat).forEach((item) => {
            const card = document.createElement('div');
            card.className = 'glass-card card';
            card.dataset.id = item.id || Math.random(); // 用于识别
            card.innerHTML = `
                <a href="${item.url}" target="_blank" onclick="${isLogged ? 'return false' : ''}">
                    <img src="https://api.faviconkit.com/${new URL(item.url).hostname}/64">
                    <div>${item.title}</div>
                </a>
                ${isLogged ? `<button onclick="editLink('${item.title}')" style="font-size:10px; padding:2px 5px; margin-top:5px;">编辑</button>` : ''}
            `;
            catGrid.appendChild(card);
        });
        grid.appendChild(section);

        // 如果已登录，启用拖拽
        if (isLogged) {
            const s = new Sortable(catGrid, {
                group: 'shared', // 允许跨分类拖拽
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function() {
                    reorderLinks(); // 每次拖拽结束更新内存中的 links 数组
                }
            });
            sortables.push(s);
        }
    });
}

// 核心：根据拖拽后的 DOM 顺序重新排列数组
function reorderLinks() {
    const newLinks = [];
    document.querySelectorAll('.cat-grid').forEach(grid => {
        const category = grid.dataset.category;
        grid.querySelectorAll('.card').forEach(card => {
            const title = card.querySelector('div').innerText;
            const linkObj = links.find(l => l.title === title);
            if (linkObj) {
                linkObj.category = category; // 更新分类
                newLinks.push(linkObj);
            }
        });
    });
    links = newLinks;
}

// 登录控制
function showLoginModal() { document.getElementById('login-modal').style.display = 'flex'; }
function hideModal(id) { document.getElementById('login-modal').style.display = 'none'; document.getElementById(id).style.display = 'none'; }

function login() {
    if (document.getElementById('pass-input').value === ADMIN_PASS) {
        isLogged = true;
        hideModal('login-modal');
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('admin-actions').style.display = 'flex';
        render();
    } else { alert('密码错误'); }
}

// 设置面板功能
function showSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
    document.getElementById('wp-input').value = wallpaper;
}

function applyWallpaper() {
    wallpaper = document.getElementById('wp-input').value;
    document.getElementById('bg-layer').style.backgroundImage = `url(${wallpaper})`;
    alert('预览效果已应用，记得点击主页“保存云端”才会持久生效');
}

function addLink() {
    const title = prompt("输入名称");
    const url = prompt("输入网址", "https://");
    const category = prompt("输入分类", "默认");
    if (title && url) {
        links.push({ title, url, category });
        render();
        hideModal('settings-modal');
    }
}

// 编辑链接（简化版）
function editLink(oldTitle) {
    const index = links.findIndex(l => l.title === oldTitle);
    const newTitle = prompt("修改名称", links[index].title);
    const newUrl = prompt("修改网址", links[index].url);
    if (newTitle && newUrl) {
        links[index].title = newTitle;
        links[index].url = newUrl;
        render();
    }
}

async function saveAll() {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_PASS}` },
        body: JSON.stringify({ links, wallpaper })
    });
    if (res.ok) alert('数据已同步至云端！');
}

init();
