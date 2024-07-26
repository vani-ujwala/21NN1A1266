from Flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Replace with actual e-commerce API endpoints
ecommerce_apis = [
    "https://api.ecommerce1.com",
    "https://api.ecommerce2.com",
    "https://api.ecommerce3.com",
    "https://api.ecommerce4.com",
    "https://api.ecommerce5.com"
]

# Sample product structure
Product = {
    "id": str,
    "name": str,
    "price": float,
    "rating": float,
    "discount": float,
    "image": str,
    "company": str
}

def fetch_products(category):
    products = []
    for api in ecommerce_apis:
        response = requests.get(f"{api}/products?category={category}")
        if response.status_code == 200:
            products.extend(response.json())
    return products

def sort_products(products, sort_by, order):
    # Implement sorting logic based on sort_by and order
    return sorted(products, key=lambda x: x[sort_by], reverse=order == "desc")

@app.route('/categories/<category>/products')
def get_products(category):
    n = int(request.args.get('n', 10))
    page = int(request.args.get('page', 1))
    sort = request.args.get('sort', 'price')
    order = request.args.get('order', 'asc')
    min_price = float(request.args.get('min_price', 0))
    max_price = float(request.args.get('max_price', float('inf')))

    products = fetch_products(category)
    products = [p for p in products if min_price <= p['price'] <= max_price]
    products = sort_products(products, sort, order)
    start_index = (page - 1) * n
    end_index = min(start_index + n, len(products))
    return jsonify(products[start_index:end_index])

@app.route('/categories/<category>/products/<product_id>')
def get_product(category, product_id):
    products = fetch_products(category)
    for product in products:
        if product['id'] == product_id:
            return jsonify(product)
    return jsonify({'error': 'Product not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
