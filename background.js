function showBookmarkWindow(tabs) {
    browser.windows.create({
        type: "popup", url: "/bookmarks.html",
        top: 0, left: 0, width: 500, height: 250
    }).then(
        (window) => {
            browser.tabs.onUpdated.addListener(
                (tabid, change, tab) => {
                    if (tabid == window.tabs[0].id && tab.status == 'complete') {
                        browser.runtime.sendMessage({
                                type: "add-bookmarks",
                                pages: tabs.map((t) => ({
                                            id: t.id,
                                            index: t.index, 
                                            title: t.title, 
                                            url: t.url})
                                        )
                            });
                        browser.tabs.onUpdated.removeListener(this);
                    }
                });
        });
}

function bookmarkRight(window, index) {
    browser.tabs.query({windowId: window}).then(
        (tabs) => {
            showBookmarkWindow(tabs.filter((t) => t.index > index));
        });
}

browser.contextMenus.create({
        contexts: ['tab'],
        id: 'bookmark-right',
        title: "Bookmark Tabs to the Right"
    });
browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId == 'bookmark-right') {
            bookmarkRight(tab.windowId, tab.index);
        }
    });

browser.commands.onCommand.addListener((command) => {
        if (command == 'bookmark-right') {
            browser.tabs.query({
                    active: true,
                    windowId: browser.windows.WINDOW_ID_CURRENT
                }).then((tabs) => {
                    bookmarkRight(browser.windows.WINDOW_ID_CURRENT, tabs[0].index);
                });
        }
    });
