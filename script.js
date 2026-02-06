const API_URL = '你的Worker地址/api/config'; 
const ADMIN_PASS = '你的管理密码'; 

let links = [];
let wallpaper = '';
let isLogged = false;

// 检查登录有效期 (10分钟)
function checkAuth() {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return false;
    const now = Date.now();
    if (now - loginTime > 10 * 60 * 1000) { // 10分钟
        localStorage.removeItem('loginTime');
        alert("登录已过期，请重新验证");
        location.reload();
        return false;
    }
    return true;
}

async function init() {
    const res = await fetch(API_URL);
    const data = await res.json();
    links = data.links || [];
    wallpaper = data.wallpaper || '';
    if (checkAuth()) { // 如果在有效期内，自动开启管理模式
        enableAdminMode();
    }
    render();
}

function render() {
    const bgUrl = wallpaper || 'https://images.unsplash.com/photo-1541123356219-284ebe98ae3b?q=80&w=1920';
    document.getElementById('bg-layer').style.backgroundImage = `url(${bgUrl})`;
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';

    const categories = [...new Set(links.map(item => item.category || '默认'))];
    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid" data-category="${cat}"></div>`;
        const catGrid = section.querySelector('.cat-grid');
        links.filter(item => (item.category || '默认') === cat).forEach(item => {
            const card = document.createElement('div');
            card.className = 'glass-card card';
            card.innerHTML = `<a href="${item.url}" target="_blank">
                <img src="https://api.faviconkit.com/${new URL(item.url).hostname}/64">
                <div>${item.title}</div></a>`;
            catGrid.appendChild(card);
        });
        grid.appendChild(section);
        if (isLogged) {
            new Sortable(catGrid, { group: 'shared', animation: 150, onEnd: reorderLinks });
        }
    });
}

function login() {
    const pass = document.getElementById('pass-input').value;
    if (pass === ADMIN_PASS) {
        localStorage.setItem('loginTime', Date.now());
        enableAdminMode();
        hideModal('login-modal');
    } else { alert('暗号不对！'); }
}

function enableAdminMode() {
    isLogged = true;
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('admin-actions').style.display = 'flex';
    render();
}

// 按钮功能
function showSettingsHub() { if(checkAuth()) showModal('settings-hub'); }
function applyWallpaper() { 
    wallpaper = document.getElementById('wp-input').value; 
    render(); 
}
function randomWallpaper() {
    wallpaper = 'https://bing.img.run/rand_uhd.php';
    render();
}

// 保存并明确回答结果
async function saveAll() {
    if(!checkAuth()) return;
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_PASS}` },
            body: JSON.stringify({ links, wallpaper })
        });
        if (res.ok) {
            alert('✅ 同步成功！数据已保存到 Cloudflare 云端。');
        } else {
            alert('❌ 同步失败，请检查网络或后端配置。');
        }
    } catch (e) {
        alert('❌ 出错啦：' + e.message);
    }
}

// 以下为弹窗控制和基础增删逻辑
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }
function addCategory() { const c = prompt("新分类名称？"); if(c) { links.push({title:'示例站点', url:'https://google.com', category:c}); render(); } }
function addLink() { const t=prompt("站名"), u=prompt("网址","https://"), c=prompt("分类","常用"); if(t&&u) { links.push({title:t,url:u,category:c}); render(); } }
// 管理功能以此类推... (篇幅限制，此处可继续完善 editCategory 等)
function reorderLinks() { /* 同前一版拖拽逻辑 */ }

init();
