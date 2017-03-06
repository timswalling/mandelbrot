'use strict';

const _            = require('lodash');
const Path         = require('path');
const beautifyHTML = require('js-beautify').html;


module.exports = function(theme, env, app){

    env.engine.addFilter('url', function(item){
        if (item.isDoc) {
            if (!item.path) {
                return '/';
            }
            return theme.urlFromRoute('page', {path: item.path});
        } else if (item.isComponent || item.isVariant) {
            return theme.urlFromRoute('component', {handle: item.handle});
        } else if (item.isAssetSource) {
            return theme.urlFromRoute('asset-source', {name: item.name});
        } else if (item.isAsset) {
            return Path.join('/', app.get('web.assets.mount'), item.srcPath);
        }
        throw new Error(`Cannot generate URL for ${item}`);
    });

    env.engine.addFilter('beautify', function(str) {
        const openingComment = 'Temporary closing tag for beautification';
        const closingComment = 'End temporary closing tag for beautification';
        const indentSize = 4;
        const placeholderRegExp = /<!-- (\/[a-z]+) -->/g;
        const wrapperRegExp = /^(<div>\s+)|(\s+<\/div>)$/g;

        const indentRegExp = new RegExp(`\\n {${indentSize}}`, 'g');

        str = str.replace(placeholderRegExp, `<!-- ${openingComment} --><$1><!-- ${closingComment} -->`);

        const closingTagRegExp = new RegExp(`\\s{${indentSize}}<!-- ${openingComment} -->\\s+?<(\/[a-z]+)>\\s+?<!-- ${closingComment} -->`, 'g')

        // Wrap the string in a div to avoid JS-Beautify bugs
        str = `<div>${str}</div>`

        str = beautifyHTML(str, {
            // TODO: move to config
            indent_size: indentSize,
            preserve_newlines: true,
            max_preserve_newlines: 1,
            unformatted: [
                'a',
                'b',
                'em',
                'i',
                'span',
                'strong',
                'sub',
                'sup',
                'u',
                'strike'
            ]
        })

        str = str.replace(wrapperRegExp, '')
        str = str.replace(indentRegExp, '\n')

        return str.replace(closingTagRegExp, '<!-- $1 -->')
    });

    env.engine.addFilter('resourceUrl', function(str) {
        return `/${app.web.get('assets.mount')}/components/${Path.relative(Path.resolve(app.components.get('path')), Path.resolve(str))}`;
    });

    env.engine.addFilter('componentPath', function(str) {
        return Path.relative(process.cwd(), Path.join(app.components.get('path'), Path.relative(Path.resolve(app.components.get('path')), Path.resolve(str))));
    });

    env.engine.addFilter('fileSize', function formatBytes(bytes, decimals) {
        if(bytes == 0) return '0 Byte';
        let k     = 1000; // or 1024 for binary
        let dm    = decimals + 1 || 3;
        let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        let i     = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    });

    env.engine.addFilter('linkRefs', function(str, item) {
        if (! (item.isComponent || item.isVariant)) {
            return str;
        }
        const refs = item.references;
        return str.replace(new RegExp(`(${refs.map(r => `\@${r.handle}`).join('|')})`, 'g'), (handle) => {
            try {
                let url = theme.urlFromRoute('component', {
                    handle: handle.replace('@', '')
                });
                const pathify = env.engine.getGlobal('path');
                url = pathify.call(this, url);
                return `<a href="${url}">${handle}</a>`;
            } catch(e) {
                return handle;
            }
        });
    });

 };
