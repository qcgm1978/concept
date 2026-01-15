// 概念参数模型 - 模拟人类思维的高级模型
class Concept {
  constructor(id, name, attributes = {}) {
    this.id = id;
    this.name = name;
    this.attributes = {
      ...attributes,
      activation: 0, // 激活度 (0-1)
      weight: 1.0,   // 权重 (0-∞)
      type: 'common', // 类型: common, abstract, concrete, emotion
      category: attributes.category || 'unknown',
      frequency: 1   // 使用频率
    };
    this.relationships = new Map();
    this.lastActivated = 0; // 上次激活时间
  }

  addRelationship(relationType, targetConcept, strength = 1.0) {
    if (!this.relationships.has(relationType)) {
      this.relationships.set(relationType, new Map());
    }
    this.relationships.get(relationType).set(targetConcept, {
      strength: strength,
      activationThreshold: 0.3,
      lastUsed: Date.now()
    });
  }

  getRelationships(relationType) {
    if (relationType) {
      return this.relationships.get(relationType) || new Map();
    }
    return this.relationships;
  }

  activate(activationLevel = 0.5) {
    // 计算新的激活度，考虑衰减
    const timeSinceLastActivation = Date.now() - this.lastActivated;
    const decayFactor = Math.exp(-timeSinceLastActivation * 0.0001); // 0.1秒衰减10%
    const currentActivation = this.attributes.activation * decayFactor;
    
    // 新的激活度不超过1.0
    this.attributes.activation = Math.min(1.0, currentActivation + activationLevel * this.attributes.weight);
    this.lastActivated = Date.now();
    this.attributes.frequency += 0.1; // 增加使用频率
    
    return this.attributes.activation;
  }

  deactivate() {
    this.attributes.activation *= 0.9; // 缓慢衰减
    if (this.attributes.activation < 0.01) {
      this.attributes.activation = 0;
    }
  }

  getActivationLevel() {
    const timeSinceLastActivation = Date.now() - this.lastActivated;
    const decayFactor = Math.exp(-timeSinceLastActivation * 0.0001);
    return this.attributes.activation * decayFactor;
  }
}

class Relationship {
  constructor(type, chineseType, description) {
    this.type = type;
    this.chineseType = chineseType;
    this.description = description;
    this.strengthModifier = 1.0;
  }
}

class WorkingMemory {
  constructor(capacity = 7) {
    this.capacity = capacity;
    this.concepts = new Map(); // conceptId -> { concept, activation, timestamp }
  }

  addConcept(concept, activation) {
    const now = Date.now();
    
    if (this.concepts.has(concept.id)) {
      // 更新现有概念
      this.concepts.set(concept.id, {
        concept: concept,
        activation: activation,
        timestamp: now
      });
    } else {
      // 添加新概念
      if (this.concepts.size >= this.capacity) {
        // 移除最旧或激活度最低的概念
        let oldestId = null;
        let lowestActivation = Infinity;
        let oldestTime = Infinity;
        
        for (const [id, entry] of this.concepts) {
          if (entry.activation < lowestActivation || 
              (entry.activation === lowestActivation && entry.timestamp < oldestTime)) {
            lowestActivation = entry.activation;
            oldestTime = entry.timestamp;
            oldestId = id;
          }
        }
        
        if (oldestId) {
          this.concepts.delete(oldestId);
        }
      }
      
      this.concepts.set(concept.id, {
        concept: concept,
        activation: activation,
        timestamp: now
      });
    }
  }

  getConcepts() {
    return Array.from(this.concepts.values()).map(entry => entry.concept);
  }

  clear() {
    this.concepts.clear();
  }

  getSize() {
    return this.concepts.size;
  }
}

class ConceptParameterModel {
  constructor() {
    this.concepts = new Map();
    this.relationshipTypes = new Map();
    this.relationshipTypeMap = new Map(); // 中文到英文映射
    this.relationshipTypeReverseMap = new Map(); // 英文到中文映射
    this.workingMemory = new WorkingMemory(7);
    this.thinkingHistory = [];
    this.autoDiscoveryInterval = null;
    
    // 初始化常见关系类型（中英文对照）
    this.addRelationshipType("is-a", "是一种", "表示概念间的上下位关系");
    this.addRelationshipType("has-a", "有", "表示概念间的组成关系");
    this.addRelationshipType("related-to", "相关", "表示概念间的关联关系");
    this.addRelationshipType("causes", "导致", "表示概念间的因果关系");
    this.addRelationshipType("similar-to", "相似", "表示概念间的相似关系");
    this.addRelationshipType("needs", "需要", "表示概念间的依赖关系");
    this.addRelationshipType("part-of", "是...的一部分", "表示概念间的部分关系");
    this.addRelationshipType("opposite-to", "相反", "表示概念间的对立关系");
  }

  addRelationshipType(type, chineseType, description) {
    this.relationshipTypes.set(
      type,
      new Relationship(type, chineseType, description)
    );
    this.relationshipTypeMap.set(chineseType, type);
    this.relationshipTypeReverseMap.set(type, chineseType);
  }

  getRelationshipTypeChinese(type) {
    return this.relationshipTypeReverseMap.get(type) || type;
  }

  getRelationshipTypeEnglish(chineseType) {
    return this.relationshipTypeMap.get(chineseType) || chineseType;
  }

  addConcept(id, name, attributes = {}) {
    const concept = new Concept(id, name, attributes);
    this.concepts.set(id, concept);
    return concept;
  }

  getConcept(id) {
    return this.concepts.get(id);
  }

  addRelationship(sourceId, relationType, targetId, strength = 1.0) {
    const source = this.getConcept(sourceId);
    const target = this.getConcept(targetId);
    if (source && target) {
      const englishRelationType = this.getRelationshipTypeEnglish(relationType);
      source.addRelationship(englishRelationType, target, strength);
      
      const reverseRelationType = this.getReverseRelationType(englishRelationType);
      if (reverseRelationType) {
        target.addRelationship(reverseRelationType, source, strength * 0.8);
      }
    }
  }

  getReverseRelationType(relationType) {
    const reverseMap = {
      "is-a": "has-subtype",
      "has-a": "part-of",
      "causes": "caused-by",
      "needs": "needed-by",
      "similar-to": "similar-to",
      "opposite-to": "opposite-to"
    };

    const reverseType = reverseMap[relationType] || "related-to";

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

  // 传播激活算法
  spreadActivation(sourceId, initialActivation = 0.8, maxDepth = 3, decay = 0.5) {
    const activatedConcepts = new Map();
    const queue = [];
    
    const source = this.getConcept(sourceId);
    if (!source) return activatedConcepts;
    
    // 初始化源概念
    const sourceActivation = source.activate(initialActivation);
    activatedConcepts.set(source, { activation: sourceActivation, depth: 0 });
    this.workingMemory.addConcept(source, sourceActivation);
    queue.push({ concept: source, activation: sourceActivation, depth: 0 });
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // 遍历所有关系
      for (const [relationType, relationships] of current.concept.getRelationships()) {
        for (const [target, relationInfo] of relationships) {
          if (!activatedConcepts.has(target) || current.depth + 1 < activatedConcepts.get(target).depth) {
            // 计算传播的激活度
            const relationStrength = relationInfo.strength;
            const propagationActivation = current.activation * relationStrength * Math.pow(decay, current.depth + 1);
            
            // 只有超过阈值才激活
            if (propagationActivation > relationInfo.activationThreshold) {
              const targetActivation = target.activate(propagationActivation);
              activatedConcepts.set(target, { activation: targetActivation, depth: current.depth + 1 });
              this.workingMemory.addConcept(target, targetActivation);
              
              if (current.depth + 1 < maxDepth) {
                queue.push({ concept: target, activation: targetActivation, depth: current.depth + 1 });
              }
            }
          }
        }
      }
    }
    
    // 记录思维历史
    this.thinkingHistory.push({
      type: 'spreadActivation',
      source: sourceId,
      activatedConcepts: Array.from(activatedConcepts.keys()).map(c => c.id),
      timestamp: Date.now()
    });
    
    return activatedConcepts;
  }

  // 推理机制
  infer(sourceId, targetId, inferenceType = 'deduction') {
    const source = this.getConcept(sourceId);
    const target = this.getConcept(targetId);
    if (!source || !target) return null;
    
    // 激活源概念
    this.spreadActivation(sourceId, 0.6, 2);
    
    let result = null;
    switch (inferenceType) {
      case 'deduction':
        result = this.deductiveInference(source, target);
        break;
      case 'induction':
        result = this.inductiveInference(source, target);
        break;
      case 'analogy':
        result = this.analogicalInference(source, target);
        break;
      case 'causal':
        result = this.causalInference(source, target);
        break;
      default:
        result = this.deductiveInference(source, target);
    }
    
    this.thinkingHistory.push({
      type: 'inference',
      source: sourceId,
      target: targetId,
      inferenceType: inferenceType,
      result: result,
      timestamp: Date.now()
    });
    
    return result;
  }

  // 演绎推理
  deductiveInference(source, target) {
    // 检查是否存在直接的is-a关系链
    const sourceAssociations = new Set(this.getAssociatedConcepts(source.id, 'is-a', 3).map(c => c.id));
    if (sourceAssociations.has(target.id)) {
      return { confidence: 0.9, type: 'deductive', description: `${source.name} 是 ${target.name} 的子类或实例` };
    }
    
    return { confidence: 0.3, type: 'deductive', description: `无法通过演绎推理确定 ${source.name} 和 ${target.name} 的关系` };
  }

  // 归纳推理
  inductiveInference(source, target) {
    // 检查共同属性和关系
    const commonAttributes = this.getCommonAttributes(source, target);
    const sourceRelations = new Set([...source.getRelationships().keys()]);
    const targetRelations = new Set([...target.getRelationships().keys()]);
    const commonRelations = [...sourceRelations].filter(r => targetRelations.has(r));
    
    const similarity = (commonAttributes.length / Math.max(Object.keys(source.attributes).length, Object.keys(target.attributes).length)) * 0.6 +
                     (commonRelations.size / Math.max(sourceRelations.size, targetRelations.size)) * 0.4;
    
    return { 
      confidence: similarity, 
      type: 'inductive', 
      description: `${source.name} 和 ${target.name} 有 ${commonAttributes.length} 个共同属性和 ${commonRelations.size} 种共同关系，相似度 ${(similarity * 100).toFixed(1)}%` 
    };
  }

  // 类比推理
  analogicalInference(source, target) {
    // 寻找相似的概念对
    let analogies = [];
    
    for (const [relType, relations] of source.getRelationships()) {
      for (const [sourceTarget, sourceRelInfo] of relations) {
        for (const [targetRelType, targetRelations] of target.getRelationships()) {
          if (relType === targetRelType) {
            for (const [targetTarget, targetRelInfo] of targetRelations) {
              const sourceSimilarity = this.calculateSimilarity(source, target);
              const targetSimilarity = this.calculateSimilarity(sourceTarget, targetTarget);
              const analogyStrength = sourceSimilarity * targetSimilarity;
              
              if (analogyStrength > 0.5) {
                analogies.push({
                  strength: analogyStrength,
                  description: `${source.name} 之于 ${sourceTarget.name} 正如 ${target.name} 之于 ${targetTarget.name}`
                });
              }
            }
          }
        }
      }
    }
    
    if (analogies.length > 0) {
      analogies.sort((a, b) => b.strength - a.strength);
      return { 
        confidence: analogies[0].strength, 
        type: 'analogical', 
        description: analogies[0].description 
      };
    }
    
    return { 
      confidence: 0.2, 
      type: 'analogical', 
      description: `无法找到 ${source.name} 和 ${target.name} 之间的有效类比关系` 
    };
  }

  // 因果推理
  causalInference(source, target) {
    // 检查直接因果关系
    const sourceCauses = source.getRelationships('causes') || new Map();
    if (sourceCauses.has(target)) {
      return { 
        confidence: 0.8, 
        type: 'causal', 
        description: `${source.name} 直接导致 ${target.name}` 
      };
    }
    
    // 检查间接因果关系
    const indirectCauses = this.findIndirectRelationships(source, target, 'causes', 3);
    if (indirectCauses.length > 0) {
      return { 
        confidence: 0.6, 
        type: 'causal', 
        description: `${source.name} 通过 ${indirectCauses.length} 步间接导致 ${target.name}` 
      };
    }
    
    return { 
      confidence: 0.3, 
      type: 'causal', 
      description: `无法确定 ${source.name} 和 ${target.name} 之间的因果关系` 
    };
  }

  // 决策机制
  decide(options, context = {}) {
    const decisionTime = Date.now();
    const evaluations = [];
    
    for (const option of options) {
      const concept = this.getConcept(option) || new Concept(option, option);
      this.spreadActivation(option, 0.7);
      
      // 评估选项
      const evaluation = {
        option: option,
        activation: concept.getActivationLevel(),
        weight: concept.attributes.weight,
        frequency: concept.attributes.frequency,
        relatednessToContext: this.calculateContextRelatedness(concept, context),
        confidence: 0
      };
      
      // 计算综合评分
      evaluation.confidence = 
        (evaluation.activation * 0.3) +
        (evaluation.weight * 0.2) +
        (evaluation.frequency * 0.2) +
        (evaluation.relatednessToContext * 0.3);
      
      evaluations.push(evaluation);
    }
    
    // 选择评分最高的选项
    evaluations.sort((a, b) => b.confidence - a.confidence);
    const bestOption = evaluations[0];
    
    this.thinkingHistory.push({
      type: 'decision',
      options: options,
      chosen: bestOption.option,
      confidence: bestOption.confidence,
      evaluations: evaluations,
      timestamp: decisionTime
    });
    
    return {
      chosen: bestOption.option,
      confidence: bestOption.confidence,
      evaluations: evaluations
    };
  }

  // 学习机制
  learn(experience, reinforcement = 1.0) {
    const { source, target, relationType, outcome } = experience;
    
    const sourceConcept = this.getConcept(source);
    const targetConcept = this.getConcept(target);
    if (!sourceConcept || !targetConcept) return;
    
    // 更新关系强度
    const relationships = sourceConcept.getRelationships(relationType);
    if (relationships && relationships.has(targetConcept)) {
      const relationInfo = relationships.get(targetConcept);
      relationInfo.strength = Math.max(0.1, Math.min(2.0, relationInfo.strength + (outcome ? reinforcement : -reinforcement * 0.5)));
      relationInfo.lastUsed = Date.now();
    }
    
    // 更新概念权重和频率
    sourceConcept.attributes.weight = Math.max(0.5, sourceConcept.attributes.weight + (outcome ? 0.1 : -0.05));
    targetConcept.attributes.weight = Math.max(0.5, targetConcept.attributes.weight + (outcome ? 0.1 : -0.05));
    
    sourceConcept.attributes.frequency += 0.2;
    targetConcept.attributes.frequency += 0.2;
    
    // 更新工作记忆
    this.workingMemory.addConcept(sourceConcept, sourceConcept.getActivationLevel());
    this.workingMemory.addConcept(targetConcept, targetConcept.getActivationLevel());
    
    this.thinkingHistory.push({
      type: 'learning',
      experience: experience,
      reinforcement: reinforcement,
      timestamp: Date.now()
    });
  }

  // 思维流模拟
  simulateThoughtFlow(duration = 5000, step = 100) {
    const startTime = Date.now();
    const thoughtFlow = [];
    
    // 随机选择一个初始概念
    const concepts = Array.from(this.concepts.values());
    if (concepts.length === 0) return thoughtFlow;
    
    let currentConcept = concepts[Math.floor(Math.random() * concepts.length)];
    
    while (Date.now() - startTime < duration) {
      // 激活当前概念
      const activation = currentConcept.activate(0.6);
      
      // 获取相关概念
      const allRelationships = currentConcept.getRelationships();
      const relatedConcepts = [];
      
      for (const [relType, relationships] of allRelationships) {
        for (const [target, relInfo] of relationships) {
          relatedConcepts.push({ target, relType, relInfo });
        }
      }
      
      if (relatedConcepts.length > 0) {
        // 基于关系强度和激活度选择下一个概念
        relatedConcepts.sort((a, b) => b.relInfo.strength - a.relInfo.strength);
        const nextIndex = Math.min(Math.floor(Math.random() * 3), relatedConcepts.length - 1);
        const next = relatedConcepts[nextIndex];
        
        thoughtFlow.push({
          from: currentConcept.id,
          to: next.target.id,
          relationType: next.relType,
          strength: next.relInfo.strength,
          activation: activation,
          timestamp: Date.now() - startTime
        });
        
        currentConcept = next.target;
      }
      
      // 短暂停顿
      this.sleep(step);
    }
    
    return thoughtFlow;
  }

  // 获取关联概念
  getAssociatedConcepts(sourceId, relationType = null, depth = 2) {
    const result = new Set();
    const visited = new Set();
    
    const dfs = (concept, currentDepth) => {
      if (visited.has(concept.id) || currentDepth > depth) return;
      visited.add(concept.id);
      
      if (currentDepth > 0) {
        result.add(concept);
      }
      
      const relationships = relationType ? 
        new Map([[relationType, concept.getRelationships(relationType)]]) : 
        concept.getRelationships();
      
      for (const [, targets] of relationships) {
        for (const [target] of targets) {
          dfs(target, currentDepth + 1);
        }
      }
    };
    
    const source = this.getConcept(sourceId);
    if (source) {
      dfs(source, 0);
    }
    
    return Array.from(result);
  }

  // 辅助方法
  getCommonAttributes(concept1, concept2) {
    const attrs1 = Object.keys(concept1.attributes).filter(k => !['activation', 'weight', 'type', 'category', 'frequency'].includes(k));
    const attrs2 = Object.keys(concept2.attributes).filter(k => !['activation', 'weight', 'type', 'category', 'frequency'].includes(k));
    return attrs1.filter(attr => attrs2.includes(attr) && concept1.attributes[attr] === concept2.attributes[attr]);
  }

  calculateSimilarity(concept1, concept2) {
    const commonAttrs = this.getCommonAttributes(concept1, concept2);
    const totalAttrs = new Set([...Object.keys(concept1.attributes), ...Object.keys(concept2.attributes)]).size;
    return commonAttrs.length / totalAttrs;
  }

  findIndirectRelationships(source, target, relationType, maxDepth) {
    const paths = [];
    const visited = new Set();
    
    const dfs = (current, path, depth) => {
      if (visited.has(current.id) || depth > maxDepth) return;
      if (current === target && path.length > 0) {
        paths.push([...path]);
        return;
      }
      
      visited.add(current.id);
      
      const relationships = current.getRelationships(relationType) || new Map();
      for (const [next] of relationships) {
        path.push(next.id);
        dfs(next, path, depth + 1);
        path.pop();
      }
      
      visited.delete(current.id);
    };
    
    dfs(source, [source.id], 0);
    return paths;
  }

  calculateContextRelatedness(concept, context) {
    if (Object.keys(context).length === 0) return 1.0;
    
    let relatedness = 0;
    let count = 0;
    
    for (const [key, value] of Object.entries(context)) {
      if (concept.attributes[key] === value) {
        relatedness += 1.0;
      }
      count++;
    }
    
    return relatedness / count;
  }

  sleep(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // 空循环模拟睡眠
    }
  }

  // 可视化数据生成
  generateVisualizationData() {
    const nodes = [];
    const edges = [];
    const edgeIds = new Set();

    // 添加所有概念作为节点
    for (const [id, concept] of this.concepts) {
      const activation = concept.getActivationLevel();
      nodes.push({
        id: id,
        label: concept.name,
        title: `概念: ${concept.name}\n激活度: ${activation.toFixed(2)}\n权重: ${concept.attributes.weight.toFixed(2)}\n类型: ${concept.attributes.type}\n类别: ${concept.attributes.category}\n使用频率: ${concept.attributes.frequency.toFixed(2)}`,
        shape: 'circle',
        color: {
          background: this.getColorByActivation(activation),
          border: this.getColorByActivation(activation, 0.8),
          highlight: {
            background: this.getColorByActivation(activation, 1.2),
            border: this.getColorByActivation(activation, 1.0),
          },
        },
        size: 20 + (activation * 15),
        font: {
          color: '#ffffff',
          size: 12 + (activation * 4)
        },
        value: activation
      });
    }

    // 添加所有关系作为边
    for (const [sourceId, concept] of this.concepts) {
      for (const [relationType, targets] of concept.getRelationships()) {
        for (const [target, relationInfo] of targets) {
          // 避免重复边
          const edgeKey = `${sourceId}-${relationType}-${target.id}`;
          const reverseEdgeKey = `${target.id}-${this.getReverseRelationType(relationType)}-${sourceId}`;
          if (!edgeIds.has(edgeKey) && !edgeIds.has(reverseEdgeKey)) {
            const chineseRelationType = this.getRelationshipTypeChinese(relationType);
            edges.push({
              from: sourceId,
              to: target.id,
              label: chineseRelationType,
              arrows: "to",
              color: {
                color: '#95a5a6',
                highlight: '#7f8c8d',
              },
              width: 1 + (relationInfo.strength * 2),
              font: {
                size: 10 + (relationInfo.strength * 2)
              },
              smooth: {
                type: "cubicBezier",
                forceDirection: "horizontal",
              },
              value: relationInfo.strength
            });
            edgeIds.add(edgeKey);
          }
        }
      }
    }

    return { nodes, edges };
  }

  getColorByActivation(activation, multiplier = 1.0) {
    const hue = 200 - (activation * 150 * multiplier); // 从蓝色到红色
    return `hsl(${hue}, 70%, 60%)`;
  }
  
  // 自动发现新关系
  autoDiscoverRelationships(threshold = 0.5, maxNewRelations = 10) {
    const discoveredRelations = [];
    const existingRelations = new Set();
    
    // 收集现有关系，避免重复
    for (const [sourceId, source] of this.concepts) {
      for (const [relationType, targets] of source.relationships) {
        for (const [target] of targets) {
          existingRelations.add(`${sourceId}-${relationType}-${target.id}`);
        }
      }
    }
    
    // 遍历所有概念对，寻找潜在关系
    const conceptsArray = Array.from(this.concepts.values());
    for (let i = 0; i < conceptsArray.length; i++) {
      for (let j = i + 1; j < conceptsArray.length; j++) {
        const source = conceptsArray[i];
        const target = conceptsArray[j];
        
        // 跳过已存在的关系
        let hasExistingRelation = false;
        for (const relationType of this.relationshipTypes.keys()) {
          if (existingRelations.has(`${source.id}-${relationType}-${target.id}`) ||
              existingRelations.has(`${target.id}-${relationType}-${source.id}`)) {
            hasExistingRelation = true;
            break;
          }
        }
        if (hasExistingRelation) continue;
        
        // 使用推理机制评估潜在关系
        const deduction = this.deductiveInference(source, target);
        const induction = this.inductiveInference(source, target);
        const analogy = this.analogicalInference(source, target);
        const causal = this.causalInference(source, target);
        
        // 综合评估得分
        const avgConfidence = (deduction.confidence + induction.confidence + analogy.confidence + causal.confidence) / 4;
        
        if (avgConfidence >= threshold) {
          // 选择置信度最高的推理类型
          const inferences = [deduction, induction, analogy, causal];
          inferences.sort((a, b) => b.confidence - a.confidence);
          const bestInference = inferences[0];
          
          // 确定关系类型
          let relationType = "related-to";
          if (bestInference.confidence > 0.7) {
            switch (bestInference.type) {
              case "deductive":
                relationType = "is-a";
                break;
              case "inductive":
                relationType = "similar-to";
                break;
              case "analogical":
                relationType = "similar-to";
                break;
              case "causal":
                relationType = "causes";
                break;
            }
          }
          
          // 添加新关系
          const strength = avgConfidence;
          this.addRelationship(source.id, relationType, target.id, strength);
          
          discoveredRelations.push({
            source: source.id,
            target: target.id,
            relationType: relationType,
            confidence: avgConfidence,
            inferenceType: bestInference.type
          });
          
          // 限制新关系数量
          if (discoveredRelations.length >= maxNewRelations) {
            return discoveredRelations;
          }
        }
      }
    }
    
    return discoveredRelations;
  }
  
  // 定期自动发现关系
  startAutoDiscovery(interval = 5000, threshold = 0.5, maxNewRelations = 5) {
    if (this.autoDiscoveryInterval) {
      this.stopAutoDiscovery();
    }
    
    this.autoDiscoveryInterval = setInterval(() => {
      const discovered = this.autoDiscoverRelationships(threshold, maxNewRelations);
      if (discovered.length > 0) {
        console.log(`自动发现了 ${discovered.length} 个新关系:`, discovered);
        // 触发事件通知UI更新
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('relationsDiscovered', { detail: discovered });
          window.dispatchEvent(event);
        }
      }
    }, interval);
  }
  
  // 停止自动发现
  stopAutoDiscovery() {
    if (this.autoDiscoveryInterval) {
      clearInterval(this.autoDiscoveryInterval);
      this.autoDiscoveryInterval = null;
    }
  }
  
  // 检查是否正在自动发现
  isAutoDiscovering() {
    return !!this.autoDiscoveryInterval;
  }
}

// 初始化概念参数模型
const conceptModel = new ConceptParameterModel();

// 导出模型以便外部使用
if (typeof window !== 'undefined') {
  window.ConceptParameterModel = ConceptParameterModel;
  window.conceptModel = conceptModel;
}

// 示例使用
function runExample() {
  // 添加示例概念
  conceptModel.addConcept("animal", "动物", { category: "生物", type: "abstract" });
  conceptModel.addConcept("plant", "植物", { category: "生物", type: "abstract" });
  conceptModel.addConcept("dog", "狗", { category: "动物", domesticated: true, type: "concrete" });
  conceptModel.addConcept("cat", "猫", { category: "动物", domesticated: true, type: "concrete" });
  conceptModel.addConcept("rose", "玫瑰", { category: "植物", flowering: true, type: "concrete" });
  conceptModel.addConcept("food", "食物", { category: "资源", type: "abstract" });
  conceptModel.addConcept("water", "水", { category: "资源", essential: true, type: "concrete" });
  
  // 添加示例关系
  conceptModel.addRelationship("dog", "is-a", "animal", 0.9);
  conceptModel.addRelationship("cat", "is-a", "animal", 0.9);
  conceptModel.addRelationship("rose", "is-a", "plant", 0.9);
  conceptModel.addRelationship("animal", "needs", "food", 0.8);
  conceptModel.addRelationship("animal", "needs", "water", 0.95);
  conceptModel.addRelationship("plant", "needs", "water", 0.9);
  conceptModel.addRelationship("dog", "similar-to", "cat", 0.7);
  conceptModel.addRelationship("cat", "similar-to", "dog", 0.7);
  
  // 测试传播激活
  console.log("=== 传播激活测试 ===");
  const activated = conceptModel.spreadActivation("dog", 0.8);
  activated.forEach((info, concept) => {
    console.log(`${concept.name}: 激活度=${info.activation.toFixed(3)}, 深度=${info.depth}`);
  });
  
  // 测试推理
  console.log("\n=== 推理测试 ===");
  const deduction = conceptModel.infer("dog", "animal", "deduction");
  console.log(`演绎推理: ${deduction.description}, 置信度=${deduction.confidence.toFixed(3)}`);
  
  const analogy = conceptModel.infer("dog", "cat", "analogy");
  console.log(`类比推理: ${analogy.description}, 置信度=${analogy.confidence.toFixed(3)}`);
  
  // 测试决策
  console.log("\n=== 决策测试 ===");
  const decision = conceptModel.decide(["food", "water", "rose"], { category: "资源" });
  console.log(`决策结果: ${decision.chosen}, 置信度=${decision.confidence.toFixed(3)}`);
  
  // 测试思维流模拟
  console.log("\n=== 思维流模拟 ===");
  const thoughtFlow = conceptModel.simulateThoughtFlow(2000, 200);
  thoughtFlow.forEach(step => {
    console.log(`${step.timestamp}ms: ${step.from} -> ${step.to} (${step.relationType}, 强度=${step.strength.toFixed(3)})`);
  });
  
  console.log("\n概念参数模型示例运行完成！");
}

// 页面加载完成后运行示例
if (typeof window !== 'undefined') {
  window.addEventListener('load', runExample);
}