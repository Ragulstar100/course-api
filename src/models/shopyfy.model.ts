 export interface IShopifyService{
  getAccessTokenForShop(shop: string): Promise<string | null>
  makeGraphQLRequest(query: string, variables: any): Promise<any>
  fetchShopInfo(shop: string): Promise<any>
  fetchProducts(shop: string, limit: number): Promise<any[]>
  fetchCustomers(shop: string, limit: number): Promise<any[]>
  verifyShopifyStore(shop: string): Promise<boolean>
  findCustomerByEmail(email: string): Promise<any | null>
  fetchProductDetails(shop: string, productId: string): Promise<any | null>
  createCustomerInShopify(email: string, name: string): Promise<any>
  createProductInShopify(shop: string, title: string, description: string): Promise<any>
 }