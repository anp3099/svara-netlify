import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Package, DollarSign, Tag, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { blink } from '@/blink/client'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  targetAudience: string
  keyBenefits: string
  createdAt: string
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    target_audience: '',
    key_benefits: ''
  })

  const loadProducts = async () => {
    try {
      const user = await blink.auth.me()
      console.log('Current user:', user)
      
      // Load user's products only
      const productData = await blink.db.products.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      console.log('Loaded products:', productData)
      setProducts(productData)
    } catch (error) {
      console.error('Failed to load products:', error)
      // If auth fails, show empty state
      setProducts([])
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const createProduct = async () => {
    // Validation
    if (!newProduct.name.trim()) {
      alert('Please enter a product name')
      return
    }
    if (!newProduct.category) {
      alert('Please select a category')
      return
    }

    try {
      console.log('Creating product with data:', newProduct)
      const user = await blink.auth.me()
      console.log('User for product creation:', user)
      const productId = `product_${Date.now()}`
      
      const productData = {
        id: productId,
        userId: user.id,
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        price: Number(newProduct.price) || 0,
        category: newProduct.category,
        targetAudience: newProduct.target_audience.trim(),
        keyBenefits: newProduct.key_benefits.trim()
      }
      
      console.log('Creating product with:', productData)
      await blink.db.products.create(productData)
      console.log('Product created successfully')

      setIsCreateDialogOpen(false)
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        category: '',
        target_audience: '',
        key_benefits: ''
      })
      loadProducts()
      alert('Product created successfully!')
    } catch (error) {
      console.error('Failed to create product:', error)
      alert(`Failed to create product: ${error?.message || 'Unknown error'}. Please try again.`)
    }
  }

  const updateProduct = async () => {
    if (!editingProduct) return
    
    try {
      await blink.db.products.update(editingProduct.id, {
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        category: editingProduct.category,
        targetAudience: editingProduct.targetAudience,
        keyBenefits: editingProduct.keyBenefits
      })

      setIsEditDialogOpen(false)
      setEditingProduct(null)
      loadProducts()
    } catch (error) {
      console.error('Failed to update product:', error)
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      await blink.db.products.delete(productId)
      loadProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categories = ['Software', 'Consulting', 'Marketing', 'Design', 'Development', 'Other']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your products and services for outreach campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product or service to use in your outreach campaigns.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    placeholder="AI Marketing Platform"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-price">Price ($)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    placeholder="2500"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>
                <Select value={newProduct.category} onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  placeholder="Describe your product or service..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Input
                  id="target-audience"
                  placeholder="Marketing managers, SMB owners, etc."
                  value={newProduct.target_audience}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, target_audience: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-benefits">Key Benefits</Label>
                <Textarea
                  id="key-benefits"
                  placeholder="List the main benefits and value propositions..."
                  value={newProduct.key_benefits}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, key_benefits: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createProduct} disabled={!newProduct.name}>
                  Create Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      <div className="grid gap-6">
        {filteredProducts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
              <p className="text-gray-600 mb-4">Add your first product or service to start creating targeted campaigns.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    {product.category && (
                      <Badge variant="outline">
                        <Tag className="w-3 h-3 mr-1" />
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-base">
                    {product.description || 'No description provided'}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(product)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Price: <span className="font-medium">${product.price?.toLocaleString() || 'Not set'}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      Target: <span className="font-medium">{product.targetAudience || 'Not specified'}</span>
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {new Date(product.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {product.keyBenefits && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Key Benefits:</h4>
                    <p className="text-sm text-gray-600">{product.keyBenefits}</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                  <Button 
                    onClick={() => window.location.href = '/lead-generation'}
                    variant="outline"
                    size="sm"
                  >
                    Generate Leads
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/campaigns'}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    Start Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update your product information for better campaign targeting.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-product-name">Product Name</Label>
                  <Input
                    id="edit-product-name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-price">Price ($)</Label>
                  <Input
                    id="edit-product-price"
                    type="number"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-category">Category</Label>
                <Select value={editingProduct.category} onValueChange={(value) => setEditingProduct(prev => prev ? { ...prev, category: value } : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-description">Description</Label>
                <Textarea
                  id="edit-product-description"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-target-audience">Target Audience</Label>
                <Input
                  id="edit-target-audience"
                  value={editingProduct.targetAudience}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, targetAudience: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-key-benefits">Key Benefits</Label>
                <Textarea
                  id="edit-key-benefits"
                  value={editingProduct.keyBenefits}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, keyBenefits: e.target.value } : null)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={updateProduct}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}