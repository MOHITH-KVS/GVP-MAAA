# GVP-MAAA

path:
/*frontend*/
cd "C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa"
/*backend*/
venv) PS C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa\Backend> from database import engine
At line:1 char:1
+ from database import engine
+ ~~~~
The 'from' keyword is not supported in this version of the language.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ReservedKeywordNotAllowed

(venv) PS C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa\Backend> engine.connect()
At line:1 char:16
+ engine.connect()
+                ~
An expression was expected after '('.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ExpectedExpression

/*virtual env*/
venv\Scripts\activate
localhost
http://127.0.0.1:8000/
uvicorn main:app --reload
uvicorn main:app

http://127.0.0.1:8000/docs

npm run dev 


CTRL + C
uvicorn main:app --reload
