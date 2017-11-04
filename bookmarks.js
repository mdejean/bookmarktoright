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

document.getElementById('ok').addEventListener('click', async function(ev) {
        //disable the button so it can't be clicked again
        ev.target.disabled = true;

        //if name is blank put the bookmarks in the chosen folder
        let folder = document.getElementById('folder').value;

        //otherwise create one with name `name` in `folder`
        if (document.getElementById('name').value.length > 0) {
            folder = (await browser.bookmarks.create({
                    title: document.getElementById('name').value, 
                    parentId: document.getElementById('folder').value
                })).id;
        }

        let chosen = pages
            .filter((p) => document.getElementById('page' + p.index).checked);
        let bookmarks = await Promise.all(
            chosen.map((p) => browser.bookmarks.create({
                            parentId: folder,
                            title: p.title,
                            url: p.url,
                        })
                ));

        await Promise.all(bookmarks.map((b, i) => 
                browser.bookmarks.move(b.id, {index: i})
            ));

        close();
    });

document.getElementById('cancel').addEventListener('click', close);
