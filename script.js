const API_URL = 'mynavdata.summerqwer999.workers.dev/api/config'; 
const ADMIN_PASS = '226688'; 

let links = [];
let wallpaper = '';
let isLogged = false;

// --- 初始化 ---
async function init() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        links = data.links || [];
        wallpaper = data.wallpaper || '';
        
        // 如果本地存了登录状态且未过期，自动登录
        if (checkAuth()) {
            enableAdminMode();
        }
        
        render();
    } catch (e) { console.error("初始化失败:", e); }
}

// --- 渲染核心 ---
function render() {
    // 设置背景
    const bgUrl = wallpaper || 'https://images.unsplash.com/photo-1541123356219-284ebe98ae3b?q=80&w=1920';
    document.getElementById('bg-layer').style.backgroundImage = `url(${bgUrl})`;
    
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';
    
    // 获取所有分类
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    
    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-group';
        section.innerHTML = `<h2 class="cat-title">${cat}</h2><div class="cat-grid" data-category="${cat}"></div>`;
        const catGrid = section.querySelector('.cat-grid');
        
        // 渲染分类下的卡片
        links.forEach((item, index) => {
            if ((item.category || '默认') === cat) {
                const card = document.createElement('div');
                card.className = 'glass-card card';
                card.dataset.index = index; // 绑定真实索引
                
                card.innerHTML = `
                    <a href="${item.url}" target="_blank">
                        <img src="https://api.faviconkit.com/${getDomain(item.url)}/64" onerror="this.src='https://api.faviconkit.com/default/64'">
                        <div>${item.title}</div>
                    </a>`;
                
                // 编辑模式下的点击删除事件
                card.onclick = (e) => {
                    if(document.body.classList.contains('edit-mode')) {
                        e.preventDefault(); // 阻止跳转
                        if(confirm(`确定要删除 "${item.title}" 吗？`)) {
                            links.splice(index, 1);
                            render();
                        }
                    }
                };
                catGrid.appendChild(card);
            }
        });
        
        grid.appendChild(section);
        
        // 只有已登录且不在删除模式下，才允许拖拽
        if (isLogged && !document.body.classList.contains('edit-mode')) {
            new Sortable(catGrid, { 
                group: 'shared', 
                animation: 150, 
                onEnd: reorderLinks // 拖拽结束回调
            });
        }
    });
}

// --- 弹窗与交互逻辑 (修复部分) ---

// 1. 打开任意 ID 的弹窗 (之前漏掉的就是这个!)
function showModal(id) {
    document.getElementById(id).style.display = 'flex';
}

// 2. 关闭弹窗
function hideModal(id) {
    document.getElementById(id).style.display = 'none';
}

// 3. 打开万能弹窗 (用于动态内容)
function showUniversalModal(htmlContent) {
    const container = document.getElementById('universal-content');
    container.innerHTML = htmlContent;
    document.getElementById('universal-modal').style.display = 'flex';
}

// --- 管理功能 UI ---

// 打开“添加分类”
function openAddCategoryUI() {
    const html = `
        <h3>新建分类</h3>
        <input type="text" id="new-cat-name" placeholder="输入分类名称">
        <div class="modal-btns">
            <button class="action-btn" onclick="confirmAddCategory()">确定</button>
            <button class="action-btn cancel" onclick="hideModal('universal-modal')">取消</button>
        </div>
    `;
    showUniversalModal(html);
}

function confirmAddCategory() {
    const name = document.getElementById('new-cat-name').value;
    if(name) {
        // 创建占位链接以显示分类
        links.push({ title: '新站点', url: 'https://github.com', category: name });
        render();
        hideModal('universal-modal');
        hideModal('settings-hub');
    }
}

// 打开“编辑分类” (排序+重命名+删除)
function openCategoryManager() {
    const categories = [...new Set(links.map(item => item.category || '默认'))];
    let listHtml = `<div id="cat-sort-list" class="cat-manage-list">`;
    categories.forEach(cat => {
        listHtml += `
            <div class="cat-manage-item" data-name="${cat}">
                <span class="cat-drag-handle" style="cursor:move; padding:0 10px;">☰</span>
                <input type="text" value="${cat}" onchange="renameCategory('${cat}', this.value)">
                <button class="del-icon-btn" onclick="deleteCategory('${cat}')">🗑</button>
            </div>`;
    });
    listHtml += `</div>`;
    
    const html = `
        <h3>管理分类 (拖拽☰排序)</h3>
        ${listHtml}
        <div class="modal-btns">
            <button class="action-btn" onclick="finishCategoryEdit()">完成</button>
        </div>
    `;
    showUniversalModal(html);
    
    // 启用分类列表拖拽
    new Sortable(document.getElementById('cat-sort-list'), {
        handle: '.cat-drag-handle',
        animation: 150,
        onEnd: () => {
            const newOrderCats = Array.from(document.querySelectorAll('.cat-manage-item')).map(el => el.dataset.name);
            reorderLinksByCatList(newOrderCats);
        }
    });
