// 思维模型 - 基于概念参数模型的扩展
// 概念图绘制函数
let network = null;
let isRotating = false;
let rotationSpeed = 0.5;
let rotationInterval = null;

// 初始化概念参数模型的实例，并作为主要的思维模型
const mind = window.conceptModel;

// 扩展概念参数模型，添加自动检测关系类型的功能
window.conceptModel.autoDetectRelationType = function(source, target) {
  // 1. 基于概念名称的相似度计算
  const calculateNameSimilarity = (name1, name2) => {
    const minLength = Math.min(name1.length, name2.length);
    let commonChars = 0;
    for (let i = 0; i < minLength; i++) {
      if (name1[i] === name2[i]) {
        commonChars++;
      }
    }
    return commonChars / Math.max(name1.length, name2.length);
  };

  const nameSimilarity = calculateNameSimilarity(source.name, target.name);

  // 2. 检查属性相似度
  const sourceAttrs = Object.keys(source.attributes).filter(k => !['activation', 'weight', 'type', 'category', 'frequency'].includes(k));
  const targetAttrs = Object.keys(target.attributes).filter(k => !['activation', 'weight', 'type', 'category', 'frequency'].includes(k));

  // 计算共同属性数量
  let commonAttrs = 0;
  for (const attr of sourceAttrs) {
    if (targetAttrs.includes(attr) && source.attributes[attr] === target.attributes[attr]) {
      commonAttrs++;
    }
  }

  // 计算属性相似度
  const maxAttrs = Math.max(sourceAttrs.length, targetAttrs.length);
  const attrSimilarity = maxAttrs > 0 ? commonAttrs / maxAttrs : 0;

  // 综合相似度：属性相似度权重0.7，名称相似度权重0.3
  const similarity = attrSimilarity * 0.7 + nameSimilarity * 0.3;

  // 3. 检查现有关系模式
  if ((target.attributes.category && source.attributes.category && target.attributes.category === source.attributes.category) || this.concepts.size > 0) {
    
    // 检查是否有相似的概念对
    let hasSimilarPair = false;
    for (const [, concept] of this.concepts) {
      for (const [relType] of concept.relationships) {
        if (relType === "similar-to") {
          hasSimilarPair = true;
          break;
        }
      }
      if (hasSimilarPair) break;
    }
    
    // 如果有相似对，且当前概念相似度高，推断为similar-to
    if (similarity > 0.5 || nameSimilarity > 0.6) {
      return "similar-to";
    }
    // 否则可能是related-to关系
    return "related-to";
  }

  // 4. 检查属性的包含关系
  if (source.attributes.category || target.attributes.category) {
    // 检查是否有is-a关系的可能性
    for (const [, concept] of this.concepts) {
      for (const [relType] of concept.relationships) {
        if (relType === "is-a") {
          // 尝试根据属性数量推断层级关系
          if (Object.keys(target.attributes).length >= Object.keys(source.attributes).length) {
            return "is-a";
          } else {
            return "has-subtype";
          }
        }
      }
    }
  }

  // 5. 基于概念数量的推断
  if (this.concepts.size <= 5) {
    return "related-to";
  }

  // 6. 默认关系类型
  if (similarity > 0.4) {
    return "similar-to";
  } else {
    return "related-to";
  }
};

// 示例数据
mind.addConcept("animal", "动物", { category: "生物" });
mind.addConcept("plant", "植物", { category: "生物" });
mind.addConcept("dog", "狗", { category: "动物", domesticated: true });
mind.addConcept("cat", "猫", { category: "动物", domesticated: true });
mind.addConcept("rose", "玫瑰", { category: "植物", flowering: true });
mind.addConcept("food", "食物", { category: "资源" });
mind.addConcept("water", "水", { category: "资源", essential: true });

mind.addRelationship("dog", "is-a", "animal", 0.9);
mind.addRelationship("cat", "is-a", "animal", 0.9);
mind.addRelationship("rose", "is-a", "plant", 0.9);
mind.addRelationship("animal", "needs", "food", 0.8);
mind.addRelationship("plant", "related-to", "food", 0.7);
mind.addRelationship("animal", "needs", "water", 0.95);
mind.addRelationship("dog", "similar-to", "cat", 0.7);
mind.addRelationship("cat", "similar-to", "dog", 0.7);
mind.addRelationship("animal", "related-to", "plant", 0.6);

function drawConceptGraph() {
  const container = document.getElementById("conceptGraph");
  
  // 使用概念参数模型生成可视化数据
  const data = mind.generateVisualizationData();

  const options = {
    interaction: {
      dragNodes: true,
      dragView: true,
      zoomView: true,
      hover: true,
    },
    physics: {
      enabled: true,
      solver: "forceAtlas2Based",
      forceAtlas2Based: {
        gravitationalConstant: 0,
        centralGravity: 0,
        springLength: 100,
        springConstant: 0,
      },
      maxVelocity: 0,
      minVelocity: 0,
      timestep: 0.5,
      stabilization: {
        enabled: true,
        iterations: 10,
        updateInterval: 1,
      },
    },
    layout: {
      randomSeed: 42,
      improvedLayout: true,
    },
    edges: {
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.5,
        },
      },
    },
  };

  // 创建或更新网络
  if (network) {
    network.setData(data);
    // 为新添加的节点设置初始位置
    network.once("stabilizationIterationsDone", function () {
      // 确保所有节点都在视图内
      network.fit();
    });
  } else {
    network = new vis.Network(container, data, options);

    // 添加点击事件
    network.on("click", function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const concept = mind.getConcept(nodeId);
        if (concept) {
          log(
            `点击概念: ${concept.name}\n属性: ${JSON.stringify(
              concept.attributes
            )}\n`
          );
        }
      }
    });

    // 确保所有节点都在视图内
    network.once("stabilizationIterationsDone", function () {
      network.fit();
    });
  }

  // 确保新添加的节点可见
  setTimeout(() => {
    network.fit();
  }, 100);
}

// UI 交互函数
function updateConceptLists() {
  const selectElements = ["associateSource"];
  const conceptList = document.getElementById("conceptList");

  if (conceptList) {
    conceptList.innerHTML = "";
  }
  selectElements.forEach((id) => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = "";
    }
  });

  for (const [id, concept] of mind.concepts) {
    // 更新下拉选择框
    selectElements.forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = concept.name;
        select.appendChild(option);
      }
    });

    // 更新概念标签列表
    if (conceptList) {
      const tag = document.createElement("div");
      tag.className = "concept-tag";
      tag.textContent = concept.name;
      tag.onclick = () => {
        const results = document.getElementById("results");
        if (results) {
          results.textContent += `\n概念: ${
            concept.name
          }\n属性: ${JSON.stringify(concept.attributes)}\n`;
        }
      };
      conceptList.appendChild(tag);
    }
  }

  // 更新概念图
  drawConceptGraph();
}

async function addConcept() {
  let id = document.getElementById("conceptId").value.trim();
  const name = document.getElementById("conceptName").value.trim();
  const attrStr = document.getElementById("conceptAttr").value.trim();
  const autoGenId = document.getElementById("autoGenId").checked;
  const autoRelate = document.getElementById("autoRelateConcept").checked;

  // 自动生成ID逻辑
  if (autoGenId || !id) {
    // 使用名称的拼音首字母 + 时间戳生成唯一ID
    const nameInitials = name
      .split("")
      .map((char) => char.charCodeAt(0))
      .join("");
    const timestamp = Date.now();
    id = `${nameInitials}-${timestamp}`;
    // 更新输入框显示生成的ID
    document.getElementById("conceptId").value = id;
  }

  if (!name) {
    log("请输入概念名称");
    return;
  }

  const attributes = {};
  if (attrStr) {
    const pairs = attrStr.split(",");
    pairs.forEach((pair) => {
      const [key, value] = pair.split(":").map((s) => s.trim());
      if (key && value) {
        attributes[key] = value;
      }
    });
  }

  // 添加新概念
  mind.addConcept(id, name, attributes);
  log(`添加概念: ${name} (ID: ${id})`);
  
  // 自动与现有概念建立关系
  if (autoRelate && mind.concepts.size > 1) {
    const newConcept = mind.getConcept(id);
    log(`正在自动与现有概念建立关系...`);
    
    // 遍历所有现有概念
    for (const [existingId, existingConcept] of mind.concepts) {
      // 跳过自身
      if (existingId === id) continue;
      
      // 使用本地自动检测关系类型
      const relationType = mind.autoDetectRelationType(newConcept, existingConcept);
      
      // 只添加有意义的关系（避免添加太多无意义的related-to关系）
      if (relationType !== 'related-to' || Math.random() > 0.5) {
        // 建立关系，设置随机强度
        const strength = Math.random() * 0.5 + 0.5; // 0.5-1.0
        mind.addRelationship(id, relationType, existingId, strength);
        const chineseRelationType = mind.getRelationshipTypeChinese(relationType);
        log(`自动建立关系: ${newConcept.name} ${chineseRelationType} ${existingConcept.name} (强度: ${strength.toFixed(2)})`);
      }
    }
  }
  
  updateConceptLists();

  // 清空输入，保留自动生成的ID选项
  if (autoGenId) {
    document.getElementById("conceptId").value = "";
  }
  document.getElementById("conceptName").value = "";
  document.getElementById("conceptAttr").value = "";
}

function associate() {
  const sourceId = document.getElementById("associateSource").value;
  const depth = parseInt(document.getElementById("associateDepth").value);

  const source = mind.getConcept(sourceId);
  log(`从 ${source.name} 传播激活 (深度 ${depth}):`);
  
  // 使用概念参数模型的传播激活功能
  const activated = mind.spreadActivation(sourceId, 0.8, depth);
  activated.forEach((info, concept) => {
    log(`  - ${concept.name} (激活度: ${info.activation.toFixed(3)}, 深度: ${info.depth})`);
  });
  
  // 更新可视化
  drawConceptGraph();
}

function infer() {
  const sourceId = document.getElementById("associateSource").value;
  
  // 获取一个随机的目标概念ID
  const allConceptIds = Array.from(mind.concepts.keys());
  const sourceIndex = allConceptIds.indexOf(sourceId);
  let targetId;
  if (allConceptIds.length > 1) {
    // 随机选择一个不同于源概念的目标概念
    do {
      targetId = allConceptIds[Math.floor(Math.random() * allConceptIds.length)];
    } while (targetId === sourceId);
  } else {
    // 只有一个概念时，使用自身作为目标
    targetId = sourceId;
  }

  const source = mind.getConcept(sourceId);
  const target = mind.getConcept(targetId);
  
  if (!source || !target) {
    log("推理失败：源概念或目标概念不存在");
    return;
  }
  
  // 使用概念参数模型的推理功能
  const deduction = mind.infer(sourceId, targetId, "deduction");
  const induction = mind.infer(sourceId, targetId, "induction");
  const analogy = mind.infer(sourceId, targetId, "analogy");
  const causal = mind.infer(sourceId, targetId, "causal");
  
  log(`\n=== 推理结果 (${source.name} → ${target.name}) ===`);
  log(`演绎推理: ${deduction.description} (置信度: ${deduction.confidence.toFixed(3)})`);
  log(`归纳推理: ${induction.description} (置信度: ${induction.confidence.toFixed(3)})`);
  log(`类比推理: ${analogy.description} (置信度: ${analogy.confidence.toFixed(3)})`);
  log(`因果推理: ${causal.description} (置信度: ${causal.confidence.toFixed(3)})`);
  
  // 更新可视化
  drawConceptGraph();
}

function expand() {
  const baseId = document.getElementById("associateSource").value;
  const newId = prompt("输入新概念ID:");
  const newName = prompt("输入新概念名称:");

  if (newId && newName) {
    const base = mind.getConcept(baseId);
    const newConcept = mind.addConcept(newId, newName, { category: base.attributes.category });
    mind.addRelationship(newId, "is-a", baseId, 0.9);
    
    log(`扩展概念: ${newConcept.name} (基于 ${base.name})`);
    updateConceptLists();
  }
}

function log(message) {
  const results = document.getElementById("results");
  results.textContent += `${message}\n`;
  results.scrollTop = results.scrollHeight;
}

// 旋转控制函数
function rotateGraph() {
  if (!network) return;

  const viewPosition = network.getViewPosition();
  network.moveTo({
    position: viewPosition,
    offset: { x: 0, y: 0 },
    animation: {
      duration: 100,
      easingFunction: "linear",
    },
  });

  // 应用旋转
  const width = document.getElementById("conceptGraph").offsetWidth;
  const height = document.getElementById("conceptGraph").offsetHeight;
  const centerX = width / 2;
  const centerY = height / 2;

  network.moveTo({
    position: {
      x:
        centerX +
        (viewPosition.x - centerX) * Math.cos(rotationSpeed * 0.01) -
        (viewPosition.y - centerY) * Math.sin(rotationSpeed * 0.01),
      y:
        centerY +
        (viewPosition.x - centerX) * Math.sin(rotationSpeed * 0.01) +
        (viewPosition.y - centerY) * Math.cos(rotationSpeed * 0.01),
    },
    animation: {
      duration: 100,
      easingFunction: "linear",
    },
  });
}

function toggleRotation() {
  const btn = document.getElementById("rotateBtn");
  if (isRotating) {
    // 停止旋转
    clearInterval(rotationInterval);
    btn.textContent = "开始旋转";
    log("已停止关系图旋转");
  } else {
    // 开始旋转
    rotationInterval = setInterval(rotateGraph, 100);
    btn.textContent = "停止旋转";
    log("已开始关系图旋转");
  }
  isRotating = !isRotating;
}

function updateRotationSpeed(speed) {
  rotationSpeed = parseFloat(speed);
  document.getElementById("speedValue").textContent = speed;
  log(`旋转速度已调整为: ${speed}`);
}

// 显示支持的关系类型
function showRelationshipTypes() {
  log("支持的关系类型：");
  for (const [type, relationship] of mind.relationshipTypes) {
    log(`  ${type} (${relationship.chineseType}): ${relationship.description}`);
  }
}

// 将自动发现关系相关函数绑定到window对象，确保全局可访问
window.discoverRelations = function() {
  log("开始自动发现关系...");
  
  const threshold = parseFloat(document.getElementById("discoveryThreshold").value);
  const discovered = mind.autoDiscoverRelationships(threshold);
  
  if (discovered.length > 0) {
    log(`成功发现 ${discovered.length} 个新关系：`);
    discovered.forEach(rel => {
      const source = mind.getConcept(rel.source);
      const target = mind.getConcept(rel.target);
      const chineseType = mind.getRelationshipTypeChinese(rel.relationType);
      log(`  - ${source.name} ${chineseType} ${target.name} (置信度: ${rel.confidence.toFixed(3)}, 推理类型: ${rel.inferenceType})`);
    });
    
    // 更新可视化
    updateConceptLists();
  } else {
    log("未发现新的关系。");
  }
};

window.toggleAutoDiscovery = function(event) {
  const btn = event.target;
  const statusEl = document.getElementById("discoveryStatus");
  
  if (mind.isAutoDiscovering()) {
    mind.stopAutoDiscovery();
    btn.textContent = "开始自动发现";
    statusEl.textContent = "自动发现: 已关闭";
    log("已停止自动关系发现。");
  } else {
    const threshold = parseFloat(document.getElementById("discoveryThreshold").value);
    mind.startAutoDiscovery(5000, threshold, 5);
    btn.textContent = "停止自动发现";
    statusEl.textContent = "自动发现: 已开启";
    log("已开始自动关系发现，每5秒检查一次。");
  }
};

window.updateThreshold = function(value) {
  document.getElementById("thresholdValue").textContent = value;
  log(`置信度阈值已调整为: ${value}`);
  
  // 如果自动发现已开启，重启自动发现以应用新阈值
  if (mind.isAutoDiscovering()) {
    window.toggleAutoDiscovery({target: document.querySelector('button[onclick="window.toggleAutoDiscovery(event)"]')});
    window.toggleAutoDiscovery({target: document.querySelector('button[onclick="window.toggleAutoDiscovery(event)"]')});
  }
};

// 监听自动发现的关系事件
window.addEventListener('relationsDiscovered', (event) => {
  const discovered = event.detail;
  log(`自动发现了 ${discovered.length} 个新关系：`);
  discovered.forEach(rel => {
    const source = mind.getConcept(rel.source);
    const target = mind.getConcept(rel.target);
    const chineseType = mind.getRelationshipTypeChinese(rel.relationType);
    log(`  - ${source.name} ${chineseType} ${target.name} (置信度: ${rel.confidence.toFixed(3)}, 推理类型: ${rel.inferenceType})`);
  });
  
  // 更新可视化
  updateConceptLists();
});

// 初始化界面
function init() {
  // 确保旋转状态正确初始化
  isRotating = false;
  clearInterval(rotationInterval);
  rotationInterval = null;

  // 更新按钮状态
  const btn = document.getElementById("rotateBtn");
  if (btn) {
    btn.textContent = "开始旋转";
  }

  updateConceptLists();
  drawConceptGraph();
  log("思维模型已初始化，包含示例概念和关系。");
  log("概念关系图已绘制完成，您可以：");
  log("1. 拖拽节点调整位置");
  log("2. 滚轮缩放视图");
  log("3. 点击节点查看详情");
  log("4. 添加新概念和关系后，图会自动更新");
  log("5. 使用图控制区域的按钮控制旋转");
  log("6. 支持中英文关系类型，如：is-a (是一种), related-to (相关)");
  log("7. 概念具有激活度、权重、频率等参数，模拟人类思维");
  log("8. 使用自动关系发现功能，让模型自动发现新关系");
  showRelationshipTypes();
}



// 切换手动输入ID的显示/隐藏
window.toggleManualId = function() {
  const container = document.getElementById("manualIdContainer");
  const autoGenId = document.getElementById("autoGenId").checked;
  
  if (autoGenId) {
    container.style.display = "none";
  } else {
    container.style.display = "block";
  }
};

// 切换思维结果的显示/隐藏
window.toggleResults = function() {
  const results = document.getElementById("results");
  const btn = document.getElementById("toggleResults");
  
  if (results.style.display === "none") {
    results.style.display = "block";
    btn.textContent = "▲";
  } else {
    results.style.display = "none";
    btn.textContent = "▼";
  }
};

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);