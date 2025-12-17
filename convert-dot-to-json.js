const fs = require('fs');
const path = require('path');

function parseDotFile(dotFilePath) {
    const content = fs.readFileSync(dotFilePath, 'utf-8');
    
    const nodeMap = new Map();
    const links = [];
    
    const cleanContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    const statements = cleanContent.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    const nodePattern = /^(\w+)\s*\[(.*)/;
    const edgePattern = /^(\w+)\s*--\s*(\w+)(?:\s*\[(.*))?/;

    for (let stmt of statements) {
        stmt = stmt.replace(/graph\s+\w+\s*\{/, '').replace(/\}/, '').trim();
        if (!stmt) continue;
        if (stmt.startsWith('node [') || stmt.startsWith('edge [') || stmt.startsWith('margin')) continue;

        let match = edgePattern.exec(stmt);
        if (match) {
            const source = match[1];
            const target = match[2];
            let attrsStr = match[3] || '';
            
            if (attrsStr.endsWith(']')) {
                attrsStr = attrsStr.slice(0, -1);
            }
            
            const attrs = parseAttributes(attrsStr);
            
            if (!nodeMap.has(source)) {
                nodeMap.set(source, { id: source, name: source });
            }
            if (!nodeMap.has(target)) {
                nodeMap.set(target, { id: target, name: target });
            }
            
            const link = {
                source: source,
                target: target
            };
            
            if (attrs.label) link.label = attrs.label;
            if (attrs.len) link.len = parseFloat(attrs.len);
            
            links.push(link);
            continue;
        }

        match = nodePattern.exec(stmt);
        if (match) {
            const nodeId = match[1];
            let attrsStr = match[2];
            
            if (attrsStr.endsWith(']')) {
                attrsStr = attrsStr.slice(0, -1);
            }
            
            const attrs = parseAttributes(attrsStr);
            
            if (!nodeMap.has(nodeId)) {
                const node = {
                    id: nodeId,
                    name: attrs.label || nodeId
                };
                
                if (attrs.color) node.color = attrs.color;
                if (attrs.fontsize) node.fontsize = attrs.fontsize;
                if (attrs.style) node.style = attrs.style;
                
                nodeMap.set(nodeId, node);
            } else {
                const node = nodeMap.get(nodeId);
                if (attrs.label) node.name = attrs.label;
                if (attrs.color) node.color = attrs.color;
                if (attrs.fontsize) node.fontsize = attrs.fontsize;
                if (attrs.style) node.style = attrs.style;
            }
        }
    }
    
    const nodes = Array.from(nodeMap.values());
    return { nodes, links };
}

function parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;
    
    attrString = attrString.trim().replace(/^[,;]+|[,;]+$/g, '');
    
    let pos = 0;
    while (pos < attrString.length) {
        while (pos < attrString.length && /[\s,]/.test(attrString[pos])) pos++;
        if (pos >= attrString.length) break;
        
        const keyMatch = attrString.slice(pos).match(/^(\w+)\s*=\s*/);
        if (!keyMatch) break;
        
        const key = keyMatch[1];
        pos += keyMatch[0].length;
        
        let value = '';
        if (attrString[pos] === '"' || attrString[pos] === "'") {
            const quote = attrString[pos];
            pos++;
            const endQuote = attrString.indexOf(quote, pos);
            if (endQuote !== -1) {
                value = attrString.slice(pos, endQuote);
                pos = endQuote + 1;
            } else {
                value = attrString.slice(pos);
                pos = attrString.length;
            }
        } else {
            const endMatch = attrString.slice(pos).match(/^([^,;]+)/);
            if (endMatch) {
                value = endMatch[1].trim();
                pos += endMatch[0].length;
            }
        }
        
        attrs[key] = value;
    }
    
    return attrs;
}

function convertDotToJson(dotFilePath, jsonFilePath) {
    try {
        console.log(`Чтение файла: ${dotFilePath}`);
        const graph = parseDotFile(dotFilePath);
        
        console.log(`Найдено узлов: ${graph.nodes.length}`);
        console.log(`Найдено связей: ${graph.links.length}`);
        
        fs.writeFileSync(jsonFilePath, JSON.stringify(graph, null, 2), 'utf-8');
        console.log(`Граф сохранен в: ${jsonFilePath}`);
        
        return graph;
    } catch (error) {
        console.error('Ошибка при конвертации:', error);
        throw error;
    }
}

if (require.main === module) {
    const dotFile = process.argv[2] || 'tracemap.dot';
    const jsonFile = process.argv[3] || 'graph.json';
    
    convertDotToJson(dotFile, jsonFile);
}

module.exports = { convertDotToJson, parseDotFile };

