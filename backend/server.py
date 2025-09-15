from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# AI Integration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    tags: List[str] = []
    in_stock: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: str
    tags: List[str] = []

class CartItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    user_id: str
    quantity: int = 1
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItemCreate(BaseModel):
    product_id: str
    user_id: str
    quantity: int = 1

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SearchQuery(BaseModel):
    query: str
    user_id: Optional[str] = None
    category: Optional[str] = None

# AI Helper Functions
async def get_ai_chat():
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="ecommerce-ai",
        system_message="You are an AI shopping assistant for an e-commerce platform. Help users find products, answer questions about items, and provide shopping recommendations. Be friendly, helpful, and concise."
    ).with_model("openai", "gpt-4o")

async def generate_product_description(product_name: str, category: str) -> str:
    """Generate AI-powered product description"""
    chat = await get_ai_chat()
    prompt = f"Generate a compelling, detailed product description for: {product_name} in the {category} category. Make it sound appealing and highlight key features. Keep it under 150 words."
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    return response

async def get_smart_search_results(query: str, category: Optional[str] = None) -> List[str]:
    """Use AI to enhance search with related terms"""
    chat = await get_ai_chat()
    category_filter = f" in the {category} category" if category else ""
    prompt = f"For the search query '{query}'{category_filter}, provide 5-10 relevant product search terms or related keywords that would help find similar items. Return only the keywords separated by commas, no explanations."
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    keywords = [keyword.strip() for keyword in response.split(',')]
    return keywords

async def get_product_recommendations(user_id: str, current_product_id: Optional[str] = None) -> List[str]:
    """AI-powered product recommendations"""
    chat = await get_ai_chat()
    
    # Get user's cart history for better recommendations
    user_cart = await db.cart.find({"user_id": user_id}).to_list(10)
    cart_items = []
    for item in user_cart:
        product = await db.products.find_one({"id": item["product_id"]})
        if product:
            cart_items.append(f"{product['name']} ({product['category']})")
    
    context = f"User has these items in cart/history: {', '.join(cart_items)}" if cart_items else "New user with no purchase history"
    prompt = f"Based on this context: {context}. Recommend 3-5 product categories or types that would complement their interests. Return only category names separated by commas."
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    categories = [cat.strip().lower() for cat in response.split(',')]
    return categories

# Sample Products Data
SAMPLE_PRODUCTS = [
    {
        "name": "Wireless Noise-Cancelling Headphones",
        "price": 299.99,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8fDE3NTc5MDE4ODZ8MA&ixlib=rb-4.1.0&q=85",
        "tags": ["wireless", "noise-cancelling", "audio", "premium"]
    },
    {
        "name": "Smart Laptop Pro",
        "price": 1299.99,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxlbGVjdHJvbmljc3xlbnwwfHx8fDE3NTc5MDE4ODZ8MA&ixlib=rb-4.1.0&q=85",
        "tags": ["laptop", "professional", "high-performance", "portable"]
    },
    {
        "name": "Premium Fashion Tracksuit",
        "price": 149.99,
        "category": "fashion",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxmYXNoaW9ufGVufDB8fHx8MTc1Nzg2NTgxNnww&ixlib=rb-4.1.0&q=85",
        "tags": ["tracksuit", "comfortable", "stylish", "casual"]
    },
    {
        "name": "Designer Shopping Bag Set",
        "price": 89.99,
        "category": "fashion",
        "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwyfHxmYXNoaW9ufGVufDB8fHx8MTc1Nzg2NTgxNnww&ixlib=rb-4.1.0&q=85",
        "tags": ["bags", "designer", "shopping", "accessories"]
    },
    {
        "name": "Modern Home Shelf System",
        "price": 199.99,
        "category": "home",
        "image_url": "https://images.unsplash.com/photo-1524634126442-357e0eac3c14?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxob21lJTIwcHJvZHVjdHN8ZW58MHx8fHwxNzU3OTAxODk1fDA&ixlib=rb-4.1.0&q=85",
        "tags": ["shelving", "modern", "storage", "minimalist"]
    },
    {
        "name": "Ceramic Home Decor Set",
        "price": 79.99,
        "category": "home",
        "image_url": "https://images.unsplash.com/photo-1514237487632-b60bc844a47d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxob21lJTIwcHJvZHVjdHN8ZW58MHx8fHwxNzU3OTAxODk1fDA&ixlib=rb-4.1.0&q=85",
        "tags": ["ceramic", "decor", "minimalist", "artistic"]
    },
    {
        "name": "Smart Watch Pro",
        "price": 399.99,
        "category": "electronics",
        "image_url": "https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg",
        "tags": ["smartwatch", "fitness", "technology", "premium"]
    },
    {
        "name": "Contemporary Furniture Piece",
        "price": 599.99,
        "category": "home",
        "image_url": "https://images.unsplash.com/photo-1467043153537-a4fba2cd39ef?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwzfHxob21lJTIwcHJvZHVjdHN8ZW58MHx8fHwxNzU3OTAxODk1fDA&ixlib=rb-4.1.0&q=85",
        "tags": ["furniture", "contemporary", "design", "quality"]
    }
]

# Routes
@api_router.get("/")
async def root():
    return {"message": "AI-Powered E-commerce API"}

@api_router.post("/products/seed")
async def seed_products():
    """Seed database with sample products"""
    try:
        for product_data in SAMPLE_PRODUCTS:
            # Generate AI description
            description = await generate_product_description(product_data["name"], product_data["category"])
            
            product = Product(
                **product_data,
                description=description
            )
            
            # Check if product already exists
            existing = await db.products.find_one({"name": product.name})
            if not existing:
                await db.products.insert_one(product.dict())
        
        return {"message": "Products seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, le=100)
):
    """Get products with optional filtering"""
    try:
        query = {}
        
        if category:
            query["category"] = category
            
        if search:
            # AI-enhanced search
            keywords = await get_smart_search_results(search, category)
            search_terms = [search] + keywords
            
            search_regex = "|".join([f"(?i){term}" for term in search_terms])
            query["$or"] = [
                {"name": {"$regex": search_regex}},
                {"description": {"$regex": search_regex}},
                {"tags": {"$in": [term.lower() for term in search_terms]}}
            ]
        
        products = await db.products.find(query).limit(limit).to_list(limit)
        return [Product(**product) for product in products]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get single product by ID"""
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.get("/products/recommendations/{user_id}")
async def get_recommendations(user_id: str):
    """Get AI-powered product recommendations"""
    try:
        recommended_categories = await get_product_recommendations(user_id)
        
        recommended_products = []
        for category in recommended_categories:
            products = await db.products.find({"category": {"$regex": f"(?i){category}"}}).limit(2).to_list(2)
            recommended_products.extend(products)
        
        return {
            "recommendations": [Product(**product) for product in recommended_products],
            "recommended_categories": recommended_categories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cart", response_model=CartItem)
async def add_to_cart(cart_item: CartItemCreate):
    """Add item to cart"""
    try:
        # Check if product exists
        product = await db.products.find_one({"id": cart_item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check if item already in cart
        existing_item = await db.cart.find_one({
            "product_id": cart_item.product_id, 
            "user_id": cart_item.user_id
        })
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item["quantity"] + cart_item.quantity
            await db.cart.update_one(
                {"id": existing_item["id"]},
                {"$set": {"quantity": new_quantity}}
            )
            existing_item["quantity"] = new_quantity
            return CartItem(**existing_item)
        else:
            # Create new cart item
            cart_item_obj = CartItem(**cart_item.dict())
            await db.cart.insert_one(cart_item_obj.dict())
            return cart_item_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cart/{user_id}")
async def get_cart(user_id: str):
    """Get user's cart items"""
    try:
        cart_items = await db.cart.find({"user_id": user_id}).to_list(100)
        
        # Populate with product details
        enriched_cart = []
        for item in cart_items:
            product = await db.products.find_one({"id": item["product_id"]})
            if product:
                enriched_cart.append({
                    **item,
                    "product": Product(**product).dict()
                })
        
        return {"cart_items": enriched_cart}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cart/{item_id}")
async def remove_from_cart(item_id: str):
    """Remove item from cart"""
    result = await db.cart.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return {"message": "Item removed from cart"}

@api_router.post("/chat")
async def chat_with_ai(message: dict):
    """Chat with AI shopping assistant"""
    try:
        user_message = message.get("message", "")
        user_id = message.get("user_id", "anonymous")
        
        chat = await get_ai_chat()
        
        # Get user context for better responses
        user_cart = await db.cart.find({"user_id": user_id}).to_list(10)
        context_items = []
        for item in user_cart:
            product = await db.products.find_one({"id": item["product_id"]})
            if product:
                context_items.append(product["name"])
        
        enhanced_prompt = f"User's cart contains: {', '.join(context_items) if context_items else 'empty'}. User asks: {user_message}"
        
        user_msg = UserMessage(text=enhanced_prompt)
        response = await chat.send_message(user_msg)
        
        # Save chat history
        chat_record = ChatMessage(
            user_id=user_id,
            message=user_message,
            response=response
        )
        await db.chat_history.insert_one(chat_record.dict())
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/categories")
async def get_categories():
    """Get all product categories"""
    categories = await db.products.distinct("category")
    return {"categories": categories}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()