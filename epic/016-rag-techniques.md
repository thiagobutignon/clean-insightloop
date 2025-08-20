# RAG Techniques - Técnicas Avançadas de Retrieval-Augmented Generation

## Introdução

Este documento apresenta uma compilação abrangente de técnicas avançadas de RAG (Retrieval-Augmented Generation) baseada em implementações práticas e pesquisas recentes. RAG é uma arquitetura que combina recuperação de informação com geração de linguagem para produzir respostas mais precisas e contextualizadas.

## 1. Fundamentos de RAG

### 1.1 Arquitetura Básica

```python
def simple_rag_pipeline(query, documents):
    """
    Pipeline RAG básico: Retrieval → Context → Generation
    """
    # 1. Criar embeddings do query
    query_embedding = create_embeddings(query)
    
    # 2. Buscar documentos relevantes
    relevant_docs = similarity_search(query_embedding, documents, k=5)
    
    # 3. Combinar contexto
    context = "\n\n".join([doc["text"] for doc in relevant_docs])
    
    # 4. Gerar resposta
    response = generate_response(query, context)
    
    return response
```

### 1.2 Componentes Essenciais

#### Chunking (Divisão de Texto)
```python
def chunk_text(text, chunk_size=1000, overlap=200):
    """
    Divide texto em chunks menores com sobreposição.
    
    Args:
        text: Texto completo
        chunk_size: Tamanho de cada chunk em caracteres
        overlap: Sobreposição entre chunks
    
    Returns:
        Lista de chunks de texto
    """
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunks.append(text[i:i + chunk_size])
    return chunks
```

#### Embedding Generation
```python
def create_embeddings(text, model="BAAI/bge-en-icl"):
    """
    Cria embeddings para o texto usando modelos especializados.
    """
    input_text = text if isinstance(text, list) else [text]
    
    response = client.embeddings.create(
        model=model,
        input=input_text
    )
    
    if isinstance(text, str):
        return response.data[0].embedding
    
    return [item.embedding for item in response.data]
```

#### Vector Store
```python
class SimpleVectorStore:
    """
    Armazenamento e busca vetorial usando NumPy.
    """
    def __init__(self):
        self.vectors = []
        self.texts = []
        self.metadata = []
    
    def add_item(self, text, embedding, metadata=None):
        self.vectors.append(np.array(embedding))
        self.texts.append(text)
        self.metadata.append(metadata or {})
    
    def similarity_search(self, query_embedding, k=5):
        if not self.vectors:
            return []
        
        query_vector = np.array(query_embedding)
        similarities = []
        
        for i, vector in enumerate(self.vectors):
            similarity = np.dot(query_vector, vector) / (
                np.linalg.norm(query_vector) * np.linalg.norm(vector)
            )
            similarities.append((i, similarity))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return [
            {
                "text": self.texts[idx],
                "metadata": self.metadata[idx],
                "similarity": score
            }
            for idx, score in similarities[:k]
        ]
```

## 2. Técnicas de Chunking Avançadas

### 2.1 Semantic Chunking

Divide o texto baseado em similaridade semântica entre sentenças:

```python
def semantic_chunking(text, similarity_threshold=0.7):
    """
    Chunking baseado em similaridade semântica entre sentenças.
    """
    sentences = text.split('.')
    embeddings = [create_embeddings(s) for s in sentences]
    
    chunks = []
    current_chunk = [sentences[0]]
    
    for i in range(1, len(sentences)):
        similarity = cosine_similarity(embeddings[i-1], embeddings[i])
        
        if similarity < similarity_threshold:
            # Baixa similaridade - criar novo chunk
            chunks.append('. '.join(current_chunk))
            current_chunk = [sentences[i]]
        else:
            # Alta similaridade - adicionar ao chunk atual
            current_chunk.append(sentences[i])
    
    if current_chunk:
        chunks.append('. '.join(current_chunk))
    
    return chunks
```

### 2.2 Contextual Chunk Headers (CCH)

Adiciona cabeçalhos contextuais aos chunks para melhorar a recuperação:

```python
def chunk_with_headers(text, chunk_size=1000):
    """
    Cria chunks com cabeçalhos contextuais gerados por LLM.
    """
    chunks = chunk_text(text, chunk_size)
    enhanced_chunks = []
    
    for chunk in chunks:
        # Gerar cabeçalho contextual
        header = generate_chunk_header(chunk)
        
        enhanced_chunks.append({
            "header": header,
            "text": chunk,
            "combined": f"{header}\n\n{chunk}"
        })
    
    return enhanced_chunks

def generate_chunk_header(chunk):
    """
    Usa LLM para gerar cabeçalho descritivo do chunk.
    """
    prompt = f"""
    Summarize the main topic of this text in one sentence:
    {chunk[:500]}
    """
    
    response = llm.generate(prompt, max_tokens=50)
    return response.strip()
```

### 2.3 Proposition Chunking

Extrai proposições atômicas do texto:

```python
def extract_propositions(text):
    """
    Extrai proposições independentes e auto-contidas do texto.
    """
    prompt = f"""
    Extract atomic, self-contained propositions from this text.
    Each proposition should be a complete, standalone fact.
    
    Text: {text}
    
    Propositions:
    """
    
    response = llm.generate(prompt)
    propositions = response.strip().split('\n')
    
    return [p.strip() for p in propositions if p.strip()]
```

## 3. Query Transformation Techniques

### 3.1 Query Rewriting

Reformula queries para melhor recuperação:

```python
def rewrite_query(original_query):
    """
    Reescreve query para ser mais específica e detalhada.
    """
    system_prompt = """You are an expert at improving search queries.
    Rewrite the query to be more specific, detailed, and likely to 
    retrieve relevant information."""
    
    user_prompt = f"""
    Rewrite this query for better retrieval:
    Original: {original_query}
    Rewritten:
    """
    
    response = llm.generate(system_prompt, user_prompt)
    return response.strip()
```

### 3.2 Step-Back Prompting

Gera queries mais abstratas para contexto amplo:

```python
def generate_step_back_query(query):
    """
    Gera uma query mais abstrata/geral para recuperar contexto amplo.
    """
    prompt = f"""
    Given this specific question: {query}
    
    Generate a more general, step-back question that would help 
    provide broader context for answering the original question.
    
    Step-back question:
    """
    
    response = llm.generate(prompt)
    return response.strip()
```

### 3.3 Query Decomposition

Divide queries complexas em sub-queries:

```python
def decompose_query(complex_query, num_subqueries=3):
    """
    Decompõe query complexa em múltiplas sub-queries simples.
    """
    prompt = f"""
    Break down this complex question into {num_subqueries} simpler, 
    specific sub-questions:
    
    Complex question: {complex_query}
    
    Sub-questions:
    """
    
    response = llm.generate(prompt)
    sub_queries = response.strip().split('\n')
    
    return [q.strip() for q in sub_queries if q.strip()]
```

### 3.4 HyDE (Hypothetical Document Embeddings)

Gera documento hipotético como resposta para melhorar busca:

```python
def hyde_search(query):
    """
    Usa HyDE para gerar documento hipotético e buscar similar.
    """
    # Gerar resposta hipotética
    hypothetical_answer = llm.generate(f"""
    Write a detailed, factual answer to this question:
    {query}
    """)
    
    # Criar embedding do documento hipotético
    hyde_embedding = create_embeddings(hypothetical_answer)
    
    # Buscar documentos similares ao hipotético
    results = vector_store.similarity_search(hyde_embedding)
    
    return results
```

## 4. Reranking Strategies

### 4.1 LLM-based Reranking

Usa LLM para reordenar resultados por relevância:

```python
def rerank_with_llm(query, results, top_n=3):
    """
    Reordena resultados usando pontuação de relevância do LLM.
    """
    scored_results = []
    
    for result in results:
        prompt = f"""
        On a scale of 0-10, rate how relevant this document is to the query.
        
        Query: {query}
        Document: {result['text'][:500]}
        
        Score (0-10):
        """
        
        score_text = llm.generate(prompt, temperature=0)
        score = float(extract_number(score_text, default=0))
        
        scored_results.append({
            **result,
            "relevance_score": score
        })
    
    # Ordenar por pontuação de relevância
    scored_results.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    return scored_results[:top_n]
```

### 4.2 Cross-Encoder Reranking

Usa modelos cross-encoder especializados:

```python
def cross_encoder_rerank(query, documents, model="cross-encoder/ms-marco"):
    """
    Usa cross-encoder para reranking preciso.
    """
    from sentence_transformers import CrossEncoder
    
    model = CrossEncoder(model)
    
    # Preparar pares query-documento
    pairs = [[query, doc["text"]] for doc in documents]
    
    # Obter scores
    scores = model.predict(pairs)
    
    # Adicionar scores aos documentos
    for doc, score in zip(documents, scores):
        doc["cross_encoder_score"] = score
    
    # Ordenar por score
    documents.sort(key=lambda x: x["cross_encoder_score"], reverse=True)
    
    return documents
```

### 4.3 Diversity Reranking (MMR)

Maximiza relevância enquanto minimiza redundância:

```python
def mmr_reranking(query_embedding, documents, lambda_param=0.5, k=5):
    """
    Maximal Marginal Relevance para diversidade nos resultados.
    """
    selected = []
    remaining = documents.copy()
    
    while len(selected) < k and remaining:
        best_score = -1
        best_doc = None
        best_idx = -1
        
        for i, doc in enumerate(remaining):
            # Relevância com query
            relevance = cosine_similarity(query_embedding, doc["embedding"])
            
            # Similaridade máxima com documentos já selecionados
            max_sim = 0
            for selected_doc in selected:
                sim = cosine_similarity(
                    doc["embedding"], 
                    selected_doc["embedding"]
                )
                max_sim = max(max_sim, sim)
            
            # MMR score
            mmr_score = lambda_param * relevance - (1 - lambda_param) * max_sim
            
            if mmr_score > best_score:
                best_score = mmr_score
                best_doc = doc
                best_idx = i
        
        if best_doc:
            selected.append(best_doc)
            remaining.pop(best_idx)
    
    return selected
```

## 5. Hybrid Search Techniques

### 5.1 Fusion RAG (Vector + BM25)

Combina busca vetorial com busca por palavras-chave:

```python
def fusion_retrieval(query, chunks, vector_store, bm25_index, k=5, alpha=0.5):
    """
    Combina busca vetorial e BM25 com pontuação normalizada.
    
    Args:
        alpha: Peso para busca vetorial (1-alpha para BM25)
    """
    # Busca vetorial
    query_embedding = create_embeddings(query)
    vector_results = vector_store.similarity_search(query_embedding, k=len(chunks))
    
    # Busca BM25
    bm25_results = bm25_search(bm25_index, chunks, query, k=len(chunks))
    
    # Normalizar scores
    vector_scores = normalize_scores([r["similarity"] for r in vector_results])
    bm25_scores = normalize_scores([r["bm25_score"] for r in bm25_results])
    
    # Combinar scores
    combined_results = []
    for i, chunk in enumerate(chunks):
        combined_score = (
            alpha * vector_scores.get(i, 0) + 
            (1 - alpha) * bm25_scores.get(i, 0)
        )
        
        combined_results.append({
            "text": chunk["text"],
            "combined_score": combined_score
        })
    
    # Ordenar por score combinado
    combined_results.sort(key=lambda x: x["combined_score"], reverse=True)
    
    return combined_results[:k]
```

### 5.2 Ensemble Retrieval

Combina múltiplos retrievers:

```python
def ensemble_retrieval(query, retrievers, weights=None, k=5):
    """
    Combina resultados de múltiplos retrievers.
    """
    if weights is None:
        weights = [1.0 / len(retrievers)] * len(retrievers)
    
    all_results = {}
    
    for retriever, weight in zip(retrievers, weights):
        results = retriever.retrieve(query, k=k*2)
        
        for result in results:
            doc_id = result["id"]
            if doc_id not in all_results:
                all_results[doc_id] = {
                    "text": result["text"],
                    "score": 0
                }
            all_results[doc_id]["score"] += weight * result["score"]
    
    # Converter para lista e ordenar
    final_results = list(all_results.values())
    final_results.sort(key=lambda x: x["score"], reverse=True)
    
    return final_results[:k]
```

## 6. Contextual Compression

### 6.1 Selective Compression

Remove partes irrelevantes dos chunks recuperados:

```python
def compress_chunk(chunk, query, compression_type="selective"):
    """
    Comprime chunk mantendo apenas partes relevantes para query.
    """
    if compression_type == "selective":
        prompt = f"""
        Extract ONLY sentences directly relevant to answering this query.
        Preserve exact wording, just remove irrelevant parts.
        
        Query: {query}
        Document: {chunk}
        
        Relevant sentences:
        """
    elif compression_type == "summary":
        prompt = f"""
        Summarize this document focusing ONLY on information 
        relevant to the query.
        
        Query: {query}
        Document: {chunk}
        
        Summary:
        """
    
    compressed = llm.generate(prompt, temperature=0)
    
    # Calcular taxa de compressão
    compression_ratio = 1 - (len(compressed) / len(chunk))
    
    return compressed, compression_ratio
```

### 6.2 Contextual Compression com LLMLingua

Usa modelos especializados para compressão:

```python
def llmlingua_compression(text, query, target_ratio=0.5):
    """
    Usa LLMLingua para compressão contextual inteligente.
    """
    from llmlingua import PromptCompressor
    
    compressor = PromptCompressor()
    
    compressed = compressor.compress(
        text,
        instruction=query,
        question=query,
        target_token=int(len(text.split()) * target_ratio),
        condition_compare=True,
        reorder_context="sort"
    )
    
    return compressed["compressed_prompt"]
```

## 7. Graph RAG

### 7.1 Knowledge Graph Construction

Constrói grafo de conhecimento dos documentos:

```python
def build_knowledge_graph(documents):
    """
    Constrói grafo de conhecimento extraindo entidades e relações.
    """
    import networkx as nx
    
    graph = nx.Graph()
    
    for doc in documents:
        # Extrair entidades
        entities = extract_entities(doc["text"])
        
        # Extrair relações
        relations = extract_relations(doc["text"], entities)
        
        # Adicionar ao grafo
        for entity in entities:
            graph.add_node(entity["name"], **entity)
        
        for relation in relations:
            graph.add_edge(
                relation["source"],
                relation["target"],
                relationship=relation["type"]
            )
    
    return graph

def extract_entities(text):
    """
    Extrai entidades nomeadas do texto.
    """
    prompt = f"""
    Extract all named entities (people, organizations, locations, concepts) 
    from this text:
    
    {text}
    
    Format: Entity Name | Type
    """
    
    response = llm.generate(prompt)
    entities = []
    
    for line in response.strip().split('\n'):
        if '|' in line:
            name, entity_type = line.split('|')
            entities.append({
                "name": name.strip(),
                "type": entity_type.strip()
            })
    
    return entities
```

### 7.2 Graph Traversal for RAG

Navega no grafo para encontrar informações relevantes:

```python
def graph_traversal_search(query, graph, embeddings, max_depth=3):
    """
    Busca no grafo usando traversal baseado em similaridade.
    """
    # Encontrar nós iniciais mais similares
    query_embedding = create_embeddings(query)
    
    starting_nodes = find_similar_nodes(
        query_embedding, 
        graph, 
        embeddings, 
        k=5
    )
    
    # BFS com prioridade
    visited = set()
    results = []
    queue = PriorityQueue()
    
    for node in starting_nodes:
        queue.put((-node["similarity"], 0, node["id"]))
    
    while not queue.empty() and len(results) < 10:
        neg_sim, depth, node_id = queue.get()
        
        if node_id in visited or depth > max_depth:
            continue
        
        visited.add(node_id)
        results.append(graph.nodes[node_id])
        
        # Explorar vizinhos
        for neighbor in graph.neighbors(node_id):
            if neighbor not in visited:
                edge_weight = graph[node_id][neighbor].get("weight", 0.5)
                queue.put((-edge_weight, depth + 1, neighbor))
    
    return results
```

## 8. Adaptive RAG

### 8.1 Query Classification

Classifica queries para escolher estratégia apropriada:

```python
def classify_query(query):
    """
    Classifica query em categorias para seleção de estratégia.
    """
    prompt = f"""
    Classify this query into one category:
    - Factual: Seeking specific, verifiable information
    - Analytical: Requiring analysis or explanation
    - Opinion: About subjective matters
    - Contextual: Depends on user context
    
    Query: {query}
    Category:
    """
    
    response = llm.generate(prompt, temperature=0)
    return response.strip()

def adaptive_retrieval(query, vector_store, user_context=None):
    """
    Seleciona estratégia de recuperação baseada no tipo de query.
    """
    query_type = classify_query(query)
    
    if query_type == "Factual":
        # Busca precisa com reranking
        results = factual_retrieval_strategy(query, vector_store)
    elif query_type == "Analytical":
        # Busca ampla com múltiplas perspectivas
        results = analytical_retrieval_strategy(query, vector_store)
    elif query_type == "Opinion":
        # Busca diversificada
        results = opinion_retrieval_strategy(query, vector_store)
    elif query_type == "Contextual":
        # Incorpora contexto do usuário
        results = contextual_retrieval_strategy(
            query, vector_store, user_context
        )
    
    return results
```

### 8.2 Dynamic Strategy Selection

Seleciona estratégia dinamicamente baseado em métricas:

```python
def dynamic_strategy_selection(query, strategies):
    """
    Testa múltiplas estratégias e seleciona a melhor.
    """
    best_strategy = None
    best_score = -1
    
    for strategy in strategies:
        # Executar estratégia
        results = strategy.retrieve(query, k=3)
        
        # Avaliar qualidade
        score = evaluate_retrieval_quality(query, results)
        
        if score > best_score:
            best_score = score
            best_strategy = strategy
    
    return best_strategy

def evaluate_retrieval_quality(query, results):
    """
    Avalia qualidade dos resultados recuperados.
    """
    # Métricas de qualidade
    relevance_score = calculate_relevance(query, results)
    diversity_score = calculate_diversity(results)
    coverage_score = calculate_coverage(query, results)
    
    # Pontuação combinada
    quality_score = (
        0.5 * relevance_score +
        0.3 * diversity_score +
        0.2 * coverage_score
    )
    
    return quality_score
```

## 9. Advanced Techniques

### 9.1 CRAG (Corrective RAG)

Avalia e corrige recuperação antes da geração:

```python
def corrective_rag(query, initial_results):
    """
    Avalia e corrige resultados antes de gerar resposta.
    """
    # Avaliar relevância dos resultados
    evaluation = evaluate_relevance(query, initial_results)
    
    if evaluation["relevance"] == "Correct":
        # Usar resultados como estão
        context = initial_results
    elif evaluation["relevance"] == "Incorrect":
        # Buscar na web ou fonte alternativa
        context = web_search(query)
    else:  # "Ambiguous"
        # Combinar resultados iniciais com busca adicional
        additional = web_search(query, limit=3)
        context = initial_results + additional
    
    # Gerar resposta com contexto corrigido
    response = generate_response(query, context)
    
    return response

def evaluate_relevance(query, results):
    """
    Avalia se resultados são relevantes para query.
    """
    prompt = f"""
    Evaluate if these documents are relevant to answer the query.
    
    Query: {query}
    Documents: {results[:3]}
    
    Classification (Correct/Incorrect/Ambiguous):
    """
    
    evaluation = llm.generate(prompt)
    
    return {"relevance": evaluation.strip()}
```

### 9.2 Self-RAG

RAG com auto-reflexão e refinamento:

```python
def self_rag(query, max_iterations=3):
    """
    RAG com auto-reflexão e refinamento iterativo.
    """
    response = None
    critique = None
    
    for iteration in range(max_iterations):
        # Recuperar documentos (possivelmente refinados)
        if critique:
            refined_query = refine_query_from_critique(query, critique)
            documents = retrieve_documents(refined_query)
        else:
            documents = retrieve_documents(query)
        
        # Gerar resposta
        response = generate_response(query, documents)
        
        # Auto-avaliar resposta
        critique = self_critique(query, response, documents)
        
        if critique["is_satisfactory"]:
            break
    
    return response

def self_critique(query, response, documents):
    """
    Auto-avalia qualidade da resposta.
    """
    prompt = f"""
    Evaluate this response for the query:
    
    Query: {query}
    Response: {response}
    Source Documents: {documents}
    
    Is the response:
    1. Factually accurate based on documents?
    2. Complete in answering the query?
    3. Well-supported by evidence?
    
    Provide critique and satisfaction score (0-10):
    """
    
    critique_text = llm.generate(prompt)
    
    # Parsear crítica
    score = extract_score(critique_text)
    
    return {
        "is_satisfactory": score >= 8,
        "critique": critique_text,
        "score": score
    }
```

### 9.3 RAG with Reinforcement Learning

Otimiza recuperação com feedback:

```python
class RLOptimizedRAG:
    """
    RAG otimizado com Reinforcement Learning.
    """
    def __init__(self):
        self.retrieval_policy = RetrievalPolicy()
        self.reward_history = []
    
    def retrieve_with_rl(self, query, documents):
        """
        Usa política aprendida para recuperação.
        """
        # Estado: embedding da query + metadados
        state = self.get_state(query)
        
        # Ação: selecionar documentos usando política
        action = self.retrieval_policy.select_action(state)
        selected_docs = self.apply_action(action, documents)
        
        # Gerar resposta
        response = generate_response(query, selected_docs)
        
        # Calcular recompensa (baseado em feedback)
        reward = self.calculate_reward(query, response, selected_docs)
        
        # Atualizar política
        self.retrieval_policy.update(state, action, reward)
        
        return response
    
    def calculate_reward(self, query, response, documents):
        """
        Calcula recompensa baseada em métricas de qualidade.
        """
        relevance = self.measure_relevance(query, response)
        completeness = self.measure_completeness(query, response)
        efficiency = 1.0 / len(documents)  # Penalizar muitos documentos
        
        reward = 0.5 * relevance + 0.3 * completeness + 0.2 * efficiency
        
        return reward
```

## 10. Implementação Completa com Clean Architecture

### 10.1 Domain Layer

```typescript
// src/features/rag/domain/entities/document.entity.ts
export class Document {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly embedding: number[],
    public readonly metadata: DocumentMetadata
  ) {}
  
  calculateSimilarity(other: Document): number {
    return cosineSimilarity(this.embedding, other.embedding);
  }
}

// src/features/rag/domain/value-objects/query.value-object.ts
export class Query {
  constructor(
    public readonly text: string,
    public readonly type: QueryType,
    public readonly context?: UserContext
  ) {}
  
  needsRewriting(): boolean {
    return this.text.split(' ').length < 3;
  }
}
```

### 10.2 Application Layer

```typescript
// src/features/rag/application/use-cases/adaptive-rag.use-case.ts
export class AdaptiveRAGUseCase {
  constructor(
    private readonly queryClassifier: QueryClassifier,
    private readonly retrievalStrategies: Map<QueryType, RetrievalStrategy>,
    private readonly reranker: Reranker,
    private readonly generator: ResponseGenerator
  ) {}
  
  async execute(request: RAGRequest): Promise<RAGResponse> {
    // 1. Classificar query
    const queryType = await this.queryClassifier.classify(request.query);
    
    // 2. Selecionar estratégia
    const strategy = this.retrievalStrategies.get(queryType);
    
    // 3. Recuperar documentos
    const documents = await strategy.retrieve(request.query);
    
    // 4. Reranking
    const rerankedDocs = await this.reranker.rerank(
      request.query,
      documents
    );
    
    // 5. Comprimir contexto
    const compressedContext = await this.compressor.compress(
      rerankedDocs,
      request.query
    );
    
    // 6. Gerar resposta
    const response = await this.generator.generate(
      request.query,
      compressedContext
    );
    
    return new RAGResponse(response, rerankedDocs);
  }
}
```

### 10.3 Infrastructure Layer

```typescript
// src/features/rag/infrastructure/vector-stores/qdrant.vector-store.ts
export class QdrantVectorStore implements VectorStore {
  constructor(private readonly client: QdrantClient) {}
  
  async upsert(documents: Document[]): Promise<void> {
    const points = documents.map(doc => ({
      id: doc.id,
      vector: doc.embedding,
      payload: doc.metadata
    }));
    
    await this.client.upsert({
      collection_name: 'documents',
      points
    });
  }
  
  async search(query: Query, k: number): Promise<Document[]> {
    const results = await this.client.search({
      collection_name: 'documents',
      vector: query.embedding,
      limit: k
    });
    
    return results.map(r => this.mapToDocument(r));
  }
}
```

## 11. Métricas e Avaliação

### 11.1 Métricas de Recuperação

```python
def evaluate_retrieval(query, retrieved_docs, relevant_docs):
    """
    Calcula métricas de recuperação.
    """
    # Precision: Quantos dos recuperados são relevantes
    retrieved_ids = {doc["id"] for doc in retrieved_docs}
    relevant_ids = {doc["id"] for doc in relevant_docs}
    
    true_positives = len(retrieved_ids & relevant_ids)
    precision = true_positives / len(retrieved_ids) if retrieved_ids else 0
    
    # Recall: Quantos dos relevantes foram recuperados
    recall = true_positives / len(relevant_ids) if relevant_ids else 0
    
    # F1 Score
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    # MRR (Mean Reciprocal Rank)
    for i, doc in enumerate(retrieved_docs):
        if doc["id"] in relevant_ids:
            mrr = 1 / (i + 1)
            break
    else:
        mrr = 0
    
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "mrr": mrr
    }
```

### 11.2 Métricas de Geração

```python
def evaluate_generation(query, response, reference_answer):
    """
    Avalia qualidade da resposta gerada.
    """
    # BLEU Score
    from nltk.translate.bleu_score import sentence_bleu
    bleu = sentence_bleu([reference_answer.split()], response.split())
    
    # ROUGE Score
    from rouge import Rouge
    rouge = Rouge()
    rouge_scores = rouge.get_scores(response, reference_answer)[0]
    
    # Semantic Similarity
    response_embedding = create_embeddings(response)
    reference_embedding = create_embeddings(reference_answer)
    semantic_sim = cosine_similarity(response_embedding, reference_embedding)
    
    # LLM-based Evaluation
    llm_score = evaluate_with_llm(query, response, reference_answer)
    
    return {
        "bleu": bleu,
        "rouge": rouge_scores,
        "semantic_similarity": semantic_sim,
        "llm_evaluation": llm_score
    }
```

## 12. Otimizações e Best Practices

### 12.1 Caching Strategies

```python
class RAGCache:
    """
    Sistema de cache para RAG.
    """
    def __init__(self, ttl=3600):
        self.query_cache = {}  # Cache de queries
        self.embedding_cache = {}  # Cache de embeddings
        self.response_cache = {}  # Cache de respostas
        self.ttl = ttl
    
    def get_cached_response(self, query):
        """
        Busca resposta em cache.
        """
        query_hash = self.hash_query(query)
        
        if query_hash in self.response_cache:
            cached = self.response_cache[query_hash]
            if time.time() - cached["timestamp"] < self.ttl:
                return cached["response"]
        
        return None
    
    def cache_response(self, query, response):
        """
        Armazena resposta em cache.
        """
        query_hash = self.hash_query(query)
        self.response_cache[query_hash] = {
            "response": response,
            "timestamp": time.time()
        }
```

### 12.2 Batch Processing

```python
def batch_rag_pipeline(queries, batch_size=10):
    """
    Processa múltiplas queries em batch para eficiência.
    """
    results = []
    
    for i in range(0, len(queries), batch_size):
        batch = queries[i:i + batch_size]
        
        # Criar embeddings em batch
        batch_embeddings = create_embeddings(batch)
        
        # Recuperar documentos para todo o batch
        batch_docs = []
        for embedding in batch_embeddings:
            docs = vector_store.similarity_search(embedding)
            batch_docs.append(docs)
        
        # Gerar respostas em batch
        batch_responses = generate_batch_responses(batch, batch_docs)
        
        results.extend(batch_responses)
    
    return results
```

### 12.3 Streaming Response

```python
async def streaming_rag(query):
    """
    RAG com resposta em streaming.
    """
    # Recuperar documentos
    documents = await retrieve_documents(query)
    
    # Gerar resposta em streaming
    async for chunk in generate_streaming_response(query, documents):
        yield chunk
        
        # Atualizar UI ou processar chunk
        await process_chunk(chunk)
```

## Conclusão

As técnicas avançadas de RAG apresentadas neste documento fornecem um arsenal completo para construir sistemas de recuperação e geração de alta qualidade. A escolha e combinação das técnicas deve ser baseada em:

1. **Natureza dos dados**: Estruturados vs não-estruturados
2. **Tipo de queries**: Factuais vs analíticas vs contextuais
3. **Requisitos de performance**: Latência vs precisão
4. **Recursos disponíveis**: Computacionais e de armazenamento

### Recomendações Finais

- **Comece simples**: Pipeline básico com chunking e busca vetorial
- **Itere com métricas**: Adicione técnicas baseado em avaliação
- **Combine técnicas**: Hybrid search + reranking + compression
- **Otimize para produção**: Caching, batching, streaming
- **Monitore continuamente**: Métricas de qualidade e performance

A implementação efetiva de RAG requer experimentação e ajuste fino para cada caso de uso específico.