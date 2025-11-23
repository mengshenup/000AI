from . import websocket_handler, storage_api

def init_app(app):
    app.include_router(websocket_handler.router)
    app.include_router(storage_api.router, prefix="/api")