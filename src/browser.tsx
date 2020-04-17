export function loadTheme(id: string, path: string, fn: (success: boolean, link: HTMLLinkElement) => void, scope: any) {
    if (document && document !== undefined) {
        var head = document.getElementsByTagName('head')[0], // reference to document.head for appending/ removing link nodes
            link = document.createElement('link');           // create the link node
        link.setAttribute('href', path);
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('type', 'text/css');
        link.setAttribute('data-theme-id', id);

        var sheet: any, cssRules: any;
        // get the correct properties to check for depending on the browser
        if ('sheet' in link) {
            sheet = 'sheet'; cssRules = 'cssRules';
        }
        else {
            sheet = 'styleSheet'; cssRules = 'rules';
        }

        var interval_id = setInterval(function () {                     // start checking whether the style sheet has successfully loaded
            try {
                // @ts-ignore
                if (link[sheet]) { // SUCCESS! our style sheet has loaded
                    clearInterval(interval_id);                      // clear the counters
                    clearTimeout(timeout_id);
                    // @ts-ignore
                    fn.call(scope || window, true, link);           // fire the callback with success == true
                }
            } catch (e) { } finally { }
        }, 10),                                                   // how often to check if the stylesheet is loaded
            timeout_id = setTimeout(function () {       // start counting down till fail
                clearInterval(interval_id);             // clear the counters
                clearTimeout(timeout_id);
                head.removeChild(link);                // since the style sheet didn't load, remove the link node from the DOM
                // @ts-ignore
                fn.call(scope || window, false, link); // fire the callback with success == false
            }, 7000);                                 // how long to wait before failing

        head.appendChild(link);  // insert the link node into the DOM and start loading the style sheet

        return link; // return the link node;
    }
    return null
}

export function removeThemeLink(themeId?: string) {
    themeId = themeId ? themeId : null;
    if (document && document !== undefined) {
        const elems = document.querySelectorAll(themeId ? `[data-theme-id="${themeId}"]` : '[data-theme-id]');
        elems.forEach((elem) => elem.remove());
    }
}