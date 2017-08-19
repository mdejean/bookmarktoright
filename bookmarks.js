var pages = null;

function populateTable() {
    let list = document.getElementById('bookmarks');
    
    let old_height = document.documentElement.clientHeight;
    
    for (let p of pages) {
        let input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'page' + p.index;
        input.checked = true;
        
        let title = document.createElement('div');
        title.textContent = p.title;
        
        let url = document.createElement('div');
        url.textContent = p.url;
        
        list.append(input, title, url);
    }
    
    /* browser.windows.update only takes the size including the window frame 
       and doesn't take relative changes so we need to measure the difference */
    browser.windows.get(browser.windows.WINDOW_ID_CURRENT).then(
        (win) => {
            browser.windows.update(browser.windows.WINDOW_ID_CURRENT, {
                    height: win.height + document.documentElement.scrollHeight - old_height
                });
        });
}

browser.runtime.onMessage.addListener((msg) => {
        if (msg.type == 'add-bookmarks') {
            //currently tabs are always provided in order but this isn't documented anywhere
            pages = msg.pages.sort((a, b) => a.index > b.index);
            
            populateTable();
        }
    });

browser.bookmarks.getTree().then(
    (root) => {
        function l(a, node) {
            if ('children' in node) {
                let opt = document.createElement('option');
                opt.value = node.id;
                opt.text = node.title;
                opt.setAttribute('data-level', 0);
                a.push(opt);
                a.push(...(node.children.reduce(l, [])
                        .map((e) => {
                                e.setAttribute('data-level', (e.getAttribute('data-level')|0) + 1);
                                return e;
                            })));
                        
            }
            return a;
        }
        let opts = root[0].children.reduce(l, []);
        
        for (let opt of opts) {
            opt.text = "\u00A0".repeat((opt.getAttribute('data-level')|0)*4) + opt.text;
        }
        
        document.getElementById('folder').append(...opts);
    });

function close() {
    browser.windows.remove(browser.windows.WINDOW_ID_CURRENT);
}

document.getElementById('ok').addEventListener('click', (ev) => {
        function f(folder) {
            let promises = []
            for (let p of pages) {
                if (document.getElementById('page' + p.index).checked) {
                    promises.push(
                        browser.bookmarks.create({
                                parentId: folder,
                                title: p.title,
                                url: p.url,
                            }));
                }
            }
            Promise.all(promises).then((bookmarks) => {
                    p2 = [];
                    bookmarks.forEach((b, i) => {
                            p2.push(browser.bookmarks.move(b.id, {index: i}));
                        });
                    Promise.all(p2).then(close);
                });
        }
        
        ev.target.disabled = true;
        
        if (document.getElementById('name').value.length > 0) {
            browser.bookmarks.create({
                    title: document.getElementById('name').value, 
                    parentId: document.getElementById('folder').value
                }).then((node) => {f(node.id)});
        } else {
            f(document.getElementById('folder').value);
        }
    });

document.getElementById('cancel').addEventListener('click', close);