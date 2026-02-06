// ====== 必须修改这里 ======
const API_URL = 'mynavdata.summerqwer999.workers.dev/api/config'; 
const ADMIN_PASS = '226688'; 
// =========================

let links = [];
let wallpaper = '';
let isLogged = false;

// 页面加载获取数据
async function init() {
    const res = await fetch(API_URL);
    const data = await res.json();
    links = data.links || [];
    wallpaper = data.wallpaper || '';
    render();
}

function render() {
    document.body.style.backgroundImage = `url(${wallpaper})`;
    const grid = document.getElementById('link-grid');
    grid.innerHTML = '';

    links.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'glass-card card';
        if (isLogged) {
            div.innerHTML = `
                <div class="edit-item">
                    <input onchange="update(${index},'title',this.value)" value="${item.title}">
                    <input onchange="update(${index},'url',this.value)" value="${item.url}">
                    <button onclick="del(${index})">删除</button>
                </div>`;
        } else {
            div.innerHTML = `
                <a href="${item.url}" target="_blank">
                    <img src="${item.icon}">
                    <div>${item.title}</div>
                </a>`;
        }
        grid.appendChild(div);
    });
}

function login() {
    if (document.getElementById('pass-input').value === ADMIN_PASS) {
        isLogged = true;
        document.getElementById('admin-zone').style.display = 'none';
        document.getElementById('edit-bar').style.display = 'block';
        render();
    } else { alert('密码错误'); }
}

function addCard() {
    links.push({title: '新站点', url: 'https://', icon: ''});
    render();
}

function update(i, field, val) { links[i][field] = val; }
function del(i) { links.splice(i, 1); render(); }

async function saveAll() {
    wallpaper = document.getElementById('wp-input').value || wallpaper;
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_PASS}`
        },
        body: JSON.stringify({ links, wallpaper })
    });
    if (res.ok) { alert('保存成功！'); location.reload(); }
}

init();
