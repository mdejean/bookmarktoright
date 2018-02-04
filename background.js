async function showBookmarkWindow(tabs) {
    let window = await browser.windows.create({
            type: 'popup', url: '/bookmarks.html',
            top: 0, left: 0, width: 500, height: 250
        });
    browser.tabs.onUpdated.addListener(
        function update(tabid, change, tab) {
            if (tabid != window.tabs[0].id || tab.url == 'about:blank' || change.status != 'complete') {
                return;
            }

            browser.runtime.sendMessage({
                    type: 'add-bookmarks',
                    pages: tabs.map((t) => ({
                                id: t.id,
                                index: t.index,
                                title: t.title,
                                url: t.url})
                            )
                });
            browser.tabs.onUpdated.removeListener(update);
        });
}

async function bookmarkRight(window, index) {
    let tabs = await browser.tabs.query({windowId: window});

    //to the right of index
    tabs = tabs.filter((t) => t.index > index);

    //remove duplicate tabs
    tabs = tabs.filter((t1, i1) =>
            tabs.every((t2, i2) =>
                i2 >= i1 || t2.url != t1.url
            ));

    showBookmarkWindow(tabs);
}

browser.contextMenus.create({
        contexts: ['tab'],
        id: 'bookmark-right',
        title: browser.i18n.getMessage('menuItem')
    });
browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId == 'bookmark-right') {
            bookmarkRight(tab.windowId, tab.index);
        }
    });

browser.commands.onCommand.addListener(async (command) => {
        if (command == 'bookmark-right') {
            let tabs = await browser.tabs.query({
                    active: true,
                    windowId: browser.windows.WINDOW_ID_CURRENT
                });
            bookmarkRight(browser.windows.WINDOW_ID_CURRENT, tabs[0].index);
        }
    });
