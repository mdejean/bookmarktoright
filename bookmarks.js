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

        //filter out pages the user has unchecked
        let chosen = pages.filter((p) => 
                document.getElementById('page' + p.index).checked);

        let folder = null;
        let last_index = 0;

        //if name isn't blank create the folder `name` in `folder`
        if (document.getElementById('name').value.length > 0) {
            folder = (await browser.bookmarks.create({
                    title: document.getElementById('name').value, 
                    parentId: document.getElementById('folder').value
                })).id;
        } else {
            //if name is blank put the bookmarks in `folder`
            folder = document.getElementById('folder').value

            //remove bookmarks which duplicate existing ones
            let existing = await browser.bookmarks.getChildren(folder);
            chosen = chosen.filter((p) => !existing.some((b) => b.url == p.url));

            last_index = existing[existing.length - 1].index;
        }

        let bookmarks = await Promise.all(
            chosen.map((p) => browser.bookmarks.create({
                            parentId: folder,
                            title: p.title,
                            url: p.url
                        })
                ));

        //reorder the bookmarks at the end of the folder
        //done synchronously to avoid a potential bug?
        for (let i = 0; i < bookmarks.length; i++) {
            await browser.bookmarks.move(bookmarks[i].id, {index: last_index + 1 + i});
        }

        if (document.getElementById('close').checked) {
            try {
                await browser.tabs.remove(chosen.map((p) => p.id));
            } catch (e) {
                //user has closed tab - "invalid tab id"
            }
        }

        close();
    });

document.getElementById('cancel').addEventListener('click', close);
