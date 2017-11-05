function i18nize_string(s) {
    let pos = 0;
    while (true) {
        pos = s.indexOf('__MSG_', pos);
        if (pos == -1) break;
        let end = s.indexOf('__', pos + '__MSG_'.length);
        if (end == -1) break;
        let message_id = s.slice(pos + '__MSG_'.length, end);
        let message = browser.i18n.getMessage(message_id);
        if (message !== null) {
            s = s.slice(0, pos) + message + s.slice(end + '__'.length);
        } else {
            pos += 1;
        }
    }
    
    return s;
}

function i18nize(node) {
    if (node.nodeType == Node.TEXT_NODE) {
        if (node.nodeValue.indexOf('__MSG_') != -1) {
            node.nodeValue = i18nize_string(node.nodeValue);
        }
    } else if (node.nodeType == Node.ELEMENT_NODE) {
        for (let attribute of node.getAttributeNames()) {
            if (node.getAttribute(attribute).indexOf('__MSG_') != -1) {
                node.setAttribute(attribute,
                        i18nize_string(node.getAttribute(attribute)));
            }
        }
    }

    node.childNodes.forEach(i18nize);
}

window.addEventListener('DOMContentLoaded', () => {i18nize(document);});
