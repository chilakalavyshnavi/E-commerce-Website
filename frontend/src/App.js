import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { 
  ShoppingCart, 
  Search, 
  MessageCircle, 
  Star, 
  Filter,
  Plus,
  Minus,
  X,
  Bot,
  Send,
  Sparkles,
  Heart,
  TrendingUp
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Generate a simple user ID for demo purposes
const USER_ID = 'user_' + Math.random().toString(36).substr(2, 9);

function App() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setLoading(true);
    try {
      // Seed products first
      await axios.post(`${API}/products/seed`);
      
      // Load products and other data
      await Promise.all([
        loadProducts(),
        loadCategories(),
        loadCart(),
        loadRecommendations()
      ]);
    } catch (error) {
      console.error('Error initializing app:', error);
      toast('Failed to initialize app. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(['all', ...response.data.categories]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCart = async () => {
    try {
      const response = await axios.get(`${API}/cart/${USER_ID}`);
      setCartItems(response.data.cart_items || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await axios.get(`${API}/products/recommendations/${USER_ID}`);
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    try {
      const response = await axios.get(`${API}/products`, {
        params: {
          search: searchQuery,
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        }
      });
      setFilteredProducts(response.data);
      toast.success(`Found ${response.data.length} products for "${searchQuery}"`);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Search failed. Please try again.');
    }
  };

  const filterByCategory = async (category) => {
    setSelectedCategory(category);
    try {
      const response = await axios.get(`${API}/products`, {
        params: {
          category: category !== 'all' ? category : undefined,
          search: searchQuery || undefined
        }
      });
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error filtering products:', error);
    }
  };

  const addToCart = async (product) => {
    try {
      await axios.post(`${API}/cart`, {
        product_id: product.id,
        user_id: USER_ID,
        quantity: 1
      });
      
      await loadCart();
      await loadRecommendations(); // Update recommendations after cart change
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await axios.delete(`${API}/cart/${itemId}`);
      await loadCart();
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: userMessage,
        user_id: USER_ID
      });

      setChatMessages(prev => [...prev, { type: 'ai', content: response.data.response }]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      setChatMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0).toFixed(2);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 text-lg">Loading your AI shopping experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toaster />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Store
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setChatOpen(true)}
                className="flex items-center space-x-2 hover:bg-blue-50 border-blue-200"
              >
                <Bot className="h-4 w-4" />
                <span>AI Assistant</span>
              </Button>
              
              <Button
                onClick={() => setCartOpen(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Cart ({getTotalItems()})</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-slate-800 mb-4">
            Shop Smarter with <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI</span>
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Discover products tailored to your needs with AI-powered recommendations and smart search
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Search for anything... AI will help you find it"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 py-3 text-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Button 
              onClick={handleSearch}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => filterByCategory(category)}
              className={`capitalize ${
                selectedCategory === category 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  : "hover:bg-blue-50 border-blue-200"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="text-2xl font-semibold text-slate-800">AI Recommendations for You</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} isRecommendation={true} />
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-slate-800 mb-6">
            {searchQuery ? `Search Results (${filteredProducts.length})` : 'All Products'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No products found</h3>
              <p className="text-slate-600">Try adjusting your search or browse different categories</p>
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart Modal */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Shopping Cart ({getTotalItems()} items)</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Your cart is empty</p>
              </div>
            ) : (
              <>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img 
                      src={item.product?.image_url} 
                      alt={item.product?.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.product?.name}</h4>
                      <p className="text-slate-600">${item.product?.price}</p>
                      <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">${(item.product?.price * item.quantity).toFixed(2)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-semibold">
                    <span>Total: ${getTotalPrice()}</span>
                    <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                      Checkout
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Modal */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <span>AI Shopping Assistant</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600">Hello! I'm your AI shopping assistant. How can I help you find the perfect products today?</p>
              </div>
            )}
            
            {chatMessages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Input
              placeholder="Ask me about products, recommendations, or anything..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              className="flex-1"
            />
            <Button onClick={sendChatMessage} disabled={chatLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Product Card Component
const ProductCard = ({ product, onAddToCart, isRecommendation = false }) => {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-slate-200 overflow-hidden bg-white">
      <div className="relative">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isRecommendation && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Pick
            </Badge>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {product.category}
          </Badge>
        </div>
        
        <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-slate-800">
            ${product.price}
          </span>
          
          <Button 
            onClick={() => onAddToCart(product)}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default App;