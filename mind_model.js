// 思维模型核心代码
class Concept {
  constructor(id, name, attributes = {}) {
    this.id = id;
    this.name = name;
    this.attributes = attributes;
    this.relationships = new Map();
  }

  addRelationship(relationType, targetConcept) {
    if (!this.relationships.has(relationType)) {
      this.relationships.set(relationType, new Set());
    }
    this.relationships.get(relationType).add(targetConcept);
  }

  getRelationships(relationType) {
    if (relationType) {
      return this.relationships.get(relationType) || new Set();
    }
    return this.relationships;
  }
}

class Relationship {
  constructor(type, chineseType, description) {
    this.type = type;
    this.chineseType = chineseType;
    this.description = description;
  }
}

class MindModel {
  constructor() {
    this.concepts = new Map();
    this.relationshipTypes = new Map();
    this.relationshipTypeMap = new Map(); // 中文到英文映射
    this.relationshipTypeReverseMap = new Map(); // 英文到中文映射

    // 初始化常见关系类型（中英文对照）
    this.addRelationshipType("is-a", "是一种", "表示概念间的上下位关系");
    this.addRelationshipType("has-a", "有", "表示概念间的组成关系");
    this.addRelationshipType("related-to", "相关", "表示概念间的关联关系");
    this.addRelationshipType("causes", "导致", "表示概念间的因果关系");
    this.addRelationshipType("similar-to", "相似", "表示概念间的相似关系");
    this.addRelationshipType("needs", "需要", "表示概念间的依赖关系");
  }

  addConcept(id, name, attributes = {}) {
    const concept = new Concept(id, name, attributes);
    this.concepts.set(id, concept);
    return concept;
  }

  getConcept(id) {
    return this.concepts.get(id);
  }

  addRelationshipType(type, chineseType, description) {
    this.relationshipTypes.set(
      type,
      new Relationship(type, chineseType, description)
    );
    this.relationshipTypeMap.set(chineseType, type);
    this.relationshipTypeReverseMap.set(type, chineseType);
  }

  // 获取关系类型的中文名称
  getRelationshipTypeChinese(type) {
    return this.relationshipTypeReverseMap.get(type) || type;
  }

  // 获取关系类型的英文名称（支持中文输入）
  getRelationshipTypeEnglish(chineseType) {
    return this.relationshipTypeMap.get(chineseType) || chineseType;
  }

  // 自动检测关系类型
  autoDetectRelationType(source, target) {
    // 1. 基于概念名称的相似度计算
    const calculateNameSimilarity = (name1, name2) => {
      // 简单的名称相似度计算
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
    const sourceAttrs = Object.keys(source.attributes);
    const targetAttrs = Object.keys(target.attributes);

    // 计算共同属性数量
    let commonAttrs = 0;
    for (const attr of sourceAttrs) {
      if (
        targetAttrs.includes(attr) &&
        source.attributes[attr] === target.attributes[attr]
      ) {
        commonAttrs++;
      }
    }

    // 计算属性相似度
    const maxAttrs = Math.max(sourceAttrs.length, targetAttrs.length);
    const attrSimilarity = maxAttrs > 0 ? commonAttrs / maxAttrs : 0;

    // 综合相似度：属性相似度权重0.7，名称相似度权重0.3
    const similarity = attrSimilarity * 0.7 + nameSimilarity * 0.3;

    // 3. 检查现有关系模式
    // 检查是否有直接的is-a关系或现有关系模式
    if (
      (target.attributes.category && source.attributes.category && target.attributes.category === source.attributes.category) ||
      // 如果没有category属性，尝试基于现有关系模式推断
      (this.concepts.size > 0)
    ) {
      
      // 检查是否有相似的概念对
      let hasSimilarPair = false;
      for (const [, concept] of this.concepts) {
        for (const [relType, relTargets] of concept.relationships) {
          for (const _ of relTargets) {
            if (relType === "similar-to") {
              hasSimilarPair = true;
              break;
            }
          }
          if (hasSimilarPair) break;
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
        for (const [relType, relTargets] of concept.relationships) {
          for (const _ of relTargets) {
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
    }

    // 5. 基于概念数量的推断
    // 如果是前几个概念，默认添加related-to关系
    if (this.concepts.size <= 5) {
      return "related-to";
    }

    // 6. 默认关系类型
    if (similarity > 0.4) {
      return "similar-to";
    } else {
      return "related-to";
    }
  }

  addRelationship(sourceId, relationType, targetId) {
    const source = this.getConcept(sourceId);
    const target = this.getConcept(targetId);
    if (source && target) {
      // 转换中文关系类型为英文
      const englishRelationType = this.getRelationshipTypeEnglish(relationType);
      source.addRelationship(englishRelationType, target);
      const reverseRelationType =
        this.getReverseRelationType(englishRelationType);
      if (reverseRelationType) {
        target.addRelationship(reverseRelationType, source);
      }
    }
  }

  getReverseRelationType(relationType) {
    const reverseMap = {
      "is-a": "has-subtype",
      "has-a": "part-of",
      causes: "caused-by",
      needs: "needed-by",
      "similar-to": "similar-to",
    };

    const reverseType = reverseMap[relationType] || "related-to";

    // 如果反向关系类型还没有中文映射，自动添加
    if (!this.relationshipTypeReverseMap.has(reverseType)) {
      let chineseReverseType = "";
      switch (reverseType) {
        case "has-subtype":
          chineseReverseType = "有子类型";
          break;
        case "part-of":
          chineseReverseType = "是...的一部分";
          break;
        case "caused-by":
          chineseReverseType = "由...导致";
          break;
        case "needed-by":
          chineseReverseType = "被...需要";
          break;
        default:
          chineseReverseType = "相关";
      }
      this.addRelationshipType(
        reverseType,
        chineseReverseType,
        `表示概念间的反向关系`
      );
    }

    return reverseType;
  }

  associate(sourceId, relationType = null, depth = 1) {
    const source = this.getConcept(sourceId);
    if (!source) return [];

    const result = [];
    const visited = new Set();

    const dfs = (concept, currentDepth) => {
      if (visited.has(concept.id) || currentDepth > depth) return;
      visited.add(concept.id);

      if (currentDepth > 0) {
        result.push(concept);
      }

      const relationships = relationType
        ? new Map([[relationType, concept.getRelationships(relationType)]])
        : concept.getRelationships();

      for (const [, targets] of relationships) {
        for (const target of targets) {
          dfs(target, currentDepth + 1);
        }
      }
    };

    dfs(source, 0);
    return result;
  }

  infer(sourceId, targetId) {
    const source = this.getConcept(sourceId);
    const target = this.getConcept(targetId);
    if (!source || !target) return null;

    const sourceAssociations = new Set(
      this.associate(sourceId, null, 2).map((c) => c.id)
    );
    if (sourceAssociations.has(targetId)) {
      return "间接关联";
    }

    const sourceSimilar = this.associate(sourceId, "similar-to", 1);
    const targetSimilar = this.associate(targetId, "similar-to", 1);
    const commonSimilar = new Set(sourceSimilar.map((c) => c.id)).intersection(
      new Set(targetSimilar.map((c) => c.id))
    );
    if (commonSimilar.size > 0) {
      return "相似关联";
    }

    return "无明显关联";
  }

  expandConcept(baseId, newId, newName, additionalAttributes = {}) {
    const base = this.getConcept(baseId);
    if (!base) return null;

    const newAttributes = { ...base.attributes, ...additionalAttributes };
    const newConcept = this.addConcept(newId, newName, newAttributes);
    this.addRelationship(newId, "is-a", baseId);
    return newConcept;
  }

  clusterConcepts() {
    const clusters = new Map();
    const visited = new Set();

    for (const [id, concept] of this.concepts) {
      if (visited.has(id)) continue;

      const cluster = new Set();
      const queue = [concept];

      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id)) continue;

        visited.add(current.id);
        cluster.add(current);

        for (const [, targets] of current.getRelationships()) {
          for (const target of targets) {
            if (!visited.has(target.id)) {
              queue.push(target);
            }
          }
        }
      }

      clusters.set(id, cluster);
    }

    return clusters;
  }
}

Set.prototype.intersection = function (otherSet) {
  const result = new Set();
  for (const item of this) {
    if (otherSet.has(item)) {
      result.add(item);
    }
  }
  return result;
};

// 初始化思维模型
const mind = new MindModel();

// 示例数据
mind.addConcept("animal", "动物", { category: "生物" });
mind.addConcept("plant", "植物", { category: "生物" });
mind.addConcept("dog", "狗", { category: "动物", domesticated: true });
mind.addConcept("cat", "猫", { category: "动物", domesticated: true });
mind.addConcept("rose", "玫瑰", { category: "植物", flowering: true });
mind.addConcept("food", "食物", { category: "资源" });
mind.addConcept("water", "水", { category: "资源", essential: true });

mind.addRelationship("dog", "is-a", "animal");
mind.addRelationship("cat", "is-a", "animal");
mind.addRelationship("rose", "is-a", "plant");
mind.addRelationship("animal", "related-to", "food");
mind.addRelationship("plant", "related-to", "food");
mind.addRelationship("animal", "needs", "water");
mind.addRelationship("dog", "similar-to", "cat");
mind.addRelationship("cat", "similar-to", "dog");

// 概念图绘制函数
let network = null;
let isRotating = false;
let rotationSpeed = 0.5;
let rotationInterval = null;

function drawConceptGraph() {
  const nodes = [];
  const edges = [];
  const edgeIds = new Set();

  // 添加所有概念作为节点
  for (const [id, concept] of mind.concepts) {
    nodes.push({
      id: id,
      label: concept.name,
      title: `概念: ${concept.name}\n属性: ${JSON.stringify(
        concept.attributes
      )}`,
      shape: "circle",
      color: {
        background: "#3498db",
        border: "#2980b9",
        highlight: {
          background: "#2980b9",
          border: "#1f618d",
        },
      },
      font: {
        color: "#ffffff",
      },
    });
  }

  // 添加所有关系作为边
  for (const [sourceId, concept] of mind.concepts) {
    for (const [relationType, targets] of concept.getRelationships()) {
      for (const target of targets) {
        // 避免重复边
        const edgeKey = `${sourceId}-${relationType}-${target.id}`;
        const reverseEdgeKey = `${target.id}-${mind.getReverseRelationType(
          relationType
        )}-${sourceId}`;
        if (!edgeIds.has(edgeKey) && !edgeIds.has(reverseEdgeKey)) {
          // 获取中文关系类型
          const chineseRelationType =
            mind.getRelationshipTypeChinese(relationType);
          edges.push({
            from: sourceId,
            to: target.id,
            label: chineseRelationType,
            arrows: "to",
            color: {
              color: "#95a5a6",
              highlight: "#7f8c8d",
            },
            font: {
              size: 10,
            },
            smooth: {
              type: "cubicBezier",
              forceDirection: "horizontal",
            },
          });
          edgeIds.add(edgeKey);
        }
      }
    }
  }

  // 配置网络
  const container = document.getElementById("conceptGraph");
  const data = {
    nodes: nodes,
    edges: edges,
  };

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
  const selectElements = ["sourceConcept", "targetConcept", "associateSource"];
  const conceptList = document.getElementById("conceptList");

  conceptList.innerHTML = "";
  selectElements.forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = "";
  });

  for (const [id, concept] of mind.concepts) {
    // 更新下拉选择框
    selectElements.forEach((selectId) => {
      const select = document.getElementById(selectId);
      const option = document.createElement("option");
      option.value = id;
      option.textContent = concept.name;
      select.appendChild(option);
    });

    // 更新概念标签列表
    const tag = document.createElement("div");
    tag.className = "concept-tag";
    tag.textContent = concept.name;
    tag.onclick = () => {
      document.getElementById("results").textContent += `\n概念: ${
        concept.name
      }\n属性: ${JSON.stringify(concept.attributes)}\n`;
    };
    conceptList.appendChild(tag);
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
  const useOllamaForNew = document.getElementById("useOllamaForNewConcept").checked;

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
      
      let relationType = null;
      
      // 使用ollama模型或本地算法获取关系类型
      if (useOllamaForNew) {
        relationType = await getRelationFromOllama(newConcept, existingConcept);
      }
      
      // 如果ollama调用失败或未启用，使用本地自动检测
      if (!relationType) {
        relationType = mind.autoDetectRelationType(newConcept, existingConcept);
      }
      
      // 只添加有意义的关系（避免添加太多无意义的related-to关系）
      if (relationType !== 'related-to' || Math.random() > 0.5) {
        // 建立关系
        mind.addRelationship(id, relationType, existingId);
        const chineseRelationType = mind.getRelationshipTypeChinese(relationType);
        log(`自动建立关系: ${newConcept.name} ${chineseRelationType} ${existingConcept.name}`);
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

// 调用ollama模型获取关系类型
async function getRelationFromOllama(source, target) {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemma3:1b",
        prompt: `请从以下关系类型中选择最适合描述"${source.name}"和"${target.name}"之间关系的类型，只返回关系类型的英文关键词，不要返回其他内容。\n可选关系类型：is-a, similar-to, related-to, has-a, needs, causes\n例如：猫和狗的关系是 similar-to\n回答：similar-to`,
        stream: false,
        temperature: 0.3
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const result = data.response.trim();
      // 验证结果是否在支持的关系类型中
      const supportedTypes = ["is-a", "similar-to", "related-to", "has-a", "needs", "causes"];
      if (supportedTypes.includes(result)) {
        return result;
      }
    }
  } catch (error) {
    console.error("Ollama API调用失败:", error);
    log("Ollama模型调用失败，使用本地自动检测");
  }
  return null;
}

async function addRelationship() {
  const sourceId = document.getElementById("sourceConcept").value;
  const relationType = document.getElementById("relationType").value.trim();
  const targetId = document.getElementById("targetConcept").value;
  const autoDetect = document.getElementById("autoDetectRelation").checked;
  const useOllama = document.getElementById("useOllama").checked;

  let finalRelationType = relationType;

  // 如果启用了自动检测且未输入关系类型，或者明确要求自动检测
  if (autoDetect && (!relationType || autoDetect)) {
    const source = mind.getConcept(sourceId);
    const target = mind.getConcept(targetId);
    
    // 尝试使用ollama模型获取关系类型
    if (useOllama) {
      const ollamaRelation = await getRelationFromOllama(source, target);
      if (ollamaRelation) {
        finalRelationType = ollamaRelation;
      } else {
        // ollama调用失败，使用本地自动检测
        finalRelationType = mind.autoDetectRelationType(source, target);
      }
    } else {
      // 使用本地自动检测
      finalRelationType = mind.autoDetectRelationType(source, target);
    }

    // 更新输入框显示检测到的关系类型
    document.getElementById("relationType").value =
      mind.getRelationshipTypeChinese(finalRelationType);
  } else if (!finalRelationType) {
    log("请输入关系类型");
    return;
  }

  mind.addRelationship(sourceId, finalRelationType, targetId);
  const source = mind.getConcept(sourceId);
  const target = mind.getConcept(targetId);
  const chineseRelationType = mind.getRelationshipTypeChinese(
    mind.getRelationshipTypeEnglish(finalRelationType)
  );
  log(`添加关系: ${source.name} ${chineseRelationType} ${target.name}`);
  updateConceptLists();
}

function associate() {
  const sourceId = document.getElementById("associateSource").value;
  const depth = parseInt(document.getElementById("associateDepth").value);

  const source = mind.getConcept(sourceId);
  const results = mind.associate(sourceId, null, depth);

  log(`从 ${source.name} 联想 (深度 ${depth}):`);
  results.forEach((concept) => {
    log(`  - ${concept.name} (${JSON.stringify(concept.attributes)})`);
  });
}

function infer() {
  const sourceId = document.getElementById("associateSource").value;
  const targetId = document.getElementById("targetConcept").value;

  const source = mind.getConcept(sourceId);
  const target = mind.getConcept(targetId);
  const result = mind.infer(sourceId, targetId);

  log(`推理: ${source.name} 和 ${target.name} 的关系是 ${result}`);
}

function expand() {
  const baseId = document.getElementById("associateSource").value;
  const newId = prompt("输入新概念ID:");
  const newName = prompt("输入新概念名称:");

  if (newId && newName) {
    const newConcept = mind.expandConcept(baseId, newId, newName);
    if (newConcept) {
      log(
        `扩展概念: ${newConcept.name} (基于 ${mind.getConcept(baseId).name})`
      );
      updateConceptLists();
    }
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
  showRelationshipTypes();
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);
