"use strict";
// 本站原创 C++11 解答。a、b、c、d 按题目函数参数顺序对应。
const s=String.raw;
const helpers={
bgGcd:s`int bgGcd(int x,int y) {
    while(y) { int remainder=x%y; x=y; y=remainder; }
    return x;
}`,
bgInorder:s`vector<int> bgInorder(TreeNode* root) {
    vector<int> out; stack<TreeNode*> st;
    while(root || !st.empty()) {
        while(root) { st.push(root); root=root->left; }
        root=st.top(); st.pop(); out.push_back(root->val); root=root->right;
    }
    return out;
}`,
bgLevels:s`vector<vector<int>> bgLevels(TreeNode* root) {
    vector<vector<int>> out; if(!root) return out;
    queue<TreeNode*> q; q.push(root);
    while(!q.empty()) { int n=q.size(); vector<int> row;
        while(n--) { auto p=q.front(); q.pop(); row.push_back(p->val);
            if(p->left) q.push(p->left); if(p->right) q.push(p->right);
        } out.push_back(row);
    } return out;
}`,
bgTopo:s`vector<int> bgTopo(int n, const vector<vector<int>>& edges) {
    vector<vector<int>> g(n); vector<int> indegree(n), order;
    for(auto& e:edges) { g[e[1]].push_back(e[0]); ++indegree[e[0]]; }
    for(int i=0;i<n;++i) if(!indegree[i]) order.push_back(i);
    for(size_t h=0;h<order.size();++h) for(int v:g[order[h]]) if(!--indegree[v]) order.push_back(v);
    if((int)order.size()!=n) return {}; return order;
}`,
bgReverse:s`ListNode* bgReverse(ListNode* head) {
    ListNode* prev=nullptr;
    while(head) { auto next=head->next; head->next=prev; prev=head; head=next; }
    return prev;
}`,
bgMerge:s`ListNode* bgMerge(ListNode* a,ListNode* b) {
    ListNode dummy; auto tail=&dummy;
    while(a&&b) { if(a->val<=b->val) { tail->next=a; a=a->next; }
        else { tail->next=b; b=b->next; } tail=tail->next;
    } tail->next=a?a:b; return dummy.next;
}`,
bgQueens:s`vector<vector<string>> bgQueens(int n) {
    vector<vector<string>> out; vector<string> board(n,string(n,'.'));
    vector<bool> col(n),diag1(2*n),diag2(2*n);
    function<void(int)> dfs=[&](int r) {
        if(r==n) { out.push_back(board); return; }
        for(int c=0;c<n;++c) if(!col[c]&&!diag1[r-c+n]&&!diag2[r+c]) {
            col[c]=diag1[r-c+n]=diag2[r+c]=true; board[r][c]='Q'; dfs(r+1);
            board[r][c]='.'; col[c]=diag1[r-c+n]=diag2[r+c]=false;
        }
    }; dfs(0); return out;
}`,
bgStock:s`int bgStock(int k,const vector<int>& prices) {
    k=min(k,(int)prices.size()/2); vector<int> buy(k+1,INT_MIN/2),sell(k+1);
    for(int price:prices) for(int j=k;j>=1;--j) {
        sell[j]=max(sell[j],buy[j]+price); buy[j]=max(buy[j],sell[j-1]-price);
    } return sell[k];
}`,
bgExists:s`bool bgExists(vector<vector<char>>& board,const string& word) {
    int m=board.size(),n=board[0].size();
    function<bool(int,int,int)> dfs=[&](int r,int c,int i) {
        if(i==(int)word.size()) return true;
        if(r<0||c<0||r>=m||c>=n||board[r][c]!=word[i]) return false;
        char old=board[r][c]; board[r][c]='\0';
        bool ok=dfs(r+1,c,i+1)||dfs(r-1,c,i+1)||dfs(r,c+1,i+1)||dfs(r,c-1,i+1);
        board[r][c]=old; return ok;
    };
    for(int r=0;r<m;++r) for(int c=0;c<n;++c) if(dfs(r,c,0)) return true;
    return false;
}`
};
const bodies={
1:s`unordered_map<int,int> seen;
for(int i=0;i<(int)a.size();++i) {
    auto it=seen.find(b-a[i]);
    if(it!=seen.end()) return {it->second,i};
    seen[a[i]]=i;
}
return {};`,
49:s`unordered_map<string,vector<string>> groups;
for(auto word:a) { string key=word; sort(key.begin(),key.end()); groups[key].push_back(word); }
vector<vector<string>> out;
for(auto& entry:groups) out.push_back(entry.second);
return out;`,
128:s`unordered_set<int> values(a.begin(),a.end()); int best=0;
for(int x:values) if(x==INT_MIN||!values.count(x-1)) {
    long long y=x; while(y<=INT_MAX&&values.count((int)y)) ++y;
    best=max(best,(int)(y-x));
}
return best;`,
283:s`int write=0;
for(int x:a) if(x) a[write++]=x;
fill(a.begin()+write,a.end(),0);`,
11:s`int l=0,r=(int)a.size()-1,best=0;
while(l<r) { best=max(best,(r-l)*min(a[l],a[r])); if(a[l]<a[r]) ++l; else --r; }
return best;`,
15:s`sort(a.begin(),a.end()); vector<vector<int>> out;
for(int i=0;i+2<(int)a.size();++i) {
    if(i&&a[i]==a[i-1]) continue;
    int l=i+1,r=(int)a.size()-1;
    while(l<r) { long long total=(long long)a[i]+a[l]+a[r];
        if(total==0) { out.push_back({a[i],a[l],a[r]}); int x=a[l],y=a[r];
            while(l<r&&a[l]==x) ++l; while(l<r&&a[r]==y) --r;
        } else if(total<0) ++l; else --r;
    }
}
return out;`,
42:s`int l=0,r=(int)a.size()-1,lm=0,rm=0,total=0;
while(l<=r) { if(lm<=rm) { lm=max(lm,a[l]); total+=lm-a[l++]; }
    else { rm=max(rm,a[r]); total+=rm-a[r--]; }
}
return total;`,
3:s`vector<int> last(256,-1); int l=0,best=0;
for(int r=0;r<(int)a.size();++r) { unsigned char ch=a[r]; l=max(l,last[ch]+1); last[ch]=r; best=max(best,r-l+1); }
return best;`,
438:s`vector<int> need(26),window(26),out;
for(char ch:b) ++need[ch-'a'];
for(int r=0;r<(int)a.size();++r) {
    ++window[a[r]-'a']; if(r>=(int)b.size()) --window[a[r-b.size()]-'a'];
    if(r+1>=(int)b.size()&&window==need) out.push_back(r+1-b.size());
}
return out;`,
560:s`unordered_map<long long,int> count; count[0]=1;
long long prefix=0; int answer=0;
for(int x:a) { prefix+=x; answer+=count[prefix-b]; ++count[prefix]; }
return answer;`,
239:s`deque<int> q; vector<int> out;
for(int i=0;i<(int)a.size();++i) {
    while(!q.empty()&&q.front()<=i-b) q.pop_front();
    while(!q.empty()&&a[q.back()]<=a[i]) q.pop_back();
    q.push_back(i); if(i>=b-1) out.push_back(a[q.front()]);
}
return out;`,
76:s`vector<int> need(256); for(unsigned char ch:b) ++need[ch];
int missing=b.size(),l=0,start=0,length=INT_MAX;
for(int r=0;r<(int)a.size();++r) {
    if(need[(unsigned char)a[r]]-->0) --missing;
    while(!missing) {
        if(r-l+1<length) { start=l; length=r-l+1; }
        if(++need[(unsigned char)a[l++]]>0) ++missing;
    }
}
return length==INT_MAX?"":a.substr(start,length);`,
53:s`int current=0,best=INT_MIN;
for(int x:a) { current=max(x,current+x); best=max(best,current); }
return best;`,
56:s`sort(a.begin(),a.end()); vector<vector<int>> out;
for(auto interval:a) {
    if(!out.empty()&&out.back()[1]>=interval[0]) out.back()[1]=max(out.back()[1],interval[1]);
    else out.push_back(interval);
}
return out;`,
189:s`if(a.empty()) return;
b%=a.size(); reverse(a.begin(),a.end()); reverse(a.begin(),a.begin()+b); reverse(a.begin()+b,a.end());`,
238:s`vector<int> out(a.size(),1); int prefix=1,suffix=1;
for(int i=0;i<(int)a.size();++i) { out[i]=prefix; prefix*=a[i]; }
for(int i=(int)a.size()-1;i>=0;--i) { out[i]*=suffix; suffix*=a[i]; }
return out;`,
41:s`int n=a.size();
for(int i=0;i<n;++i) while(a[i]>0&&a[i]<=n&&a[a[i]-1]!=a[i]) swap(a[i],a[a[i]-1]);
for(int i=0;i<n;++i) if(a[i]!=i+1) return i+1;
return n+1;`,
73:s`int m=a.size(),n=a[0].size(); bool firstRow=false,firstCol=false;
for(int c=0;c<n;++c) firstRow|=a[0][c]==0;
for(int r=0;r<m;++r) firstCol|=a[r][0]==0;
for(int r=1;r<m;++r) for(int c=1;c<n;++c) if(!a[r][c]) a[r][0]=a[0][c]=0;
for(int r=1;r<m;++r) for(int c=1;c<n;++c) if(!a[r][0]||!a[0][c]) a[r][c]=0;
if(firstRow) fill(a[0].begin(),a[0].end(),0);
if(firstCol) for(auto& row:a) row[0]=0;`,
54:s`vector<int> out; int top=0,bottom=(int)a.size()-1,left=0,right=(int)a[0].size()-1;
while(top<=bottom&&left<=right) {
    for(int c=left;c<=right;++c) out.push_back(a[top][c]); ++top;
    for(int r=top;r<=bottom;++r) out.push_back(a[r][right]); --right;
    if(top<=bottom) { for(int c=right;c>=left;--c) out.push_back(a[bottom][c]); --bottom; }
    if(left<=right) { for(int r=bottom;r>=top;--r) out.push_back(a[r][left]); ++left; }
}
return out;`,
48:s`int n=a.size();
for(int i=0;i<n;++i) for(int j=i+1;j<n;++j) swap(a[i][j],a[j][i]);
for(auto& row:a) reverse(row.begin(),row.end());`,
240:s`int r=0,c=(int)a[0].size()-1;
while(r<(int)a.size()&&c>=0) { if(a[r][c]==b) return true; if(a[r][c]>b) --c; else ++r; }
return false;`,
160:s`auto x=a,y=b;
while(x!=y) { x=x?x->next:b; y=y?y->next:a; }
return x;`,
206:s`return bgReverse(a);`,
234:s`if(!a) return true;
auto slow=a,fast=a;
while(fast->next&&fast->next->next) { slow=slow->next; fast=fast->next->next; }
auto second=bgReverse(slow->next),x=a,y=second; bool ok=true;
while(y) { if(x->val!=y->val) ok=false; x=x->next; y=y->next; }
slow->next=bgReverse(second); return ok;`,
141:s`auto slow=a,fast=a;
while(fast&&fast->next) { slow=slow->next; fast=fast->next->next; if(slow==fast) return true; }
return false;`,
142:s`auto slow=a,fast=a;
while(fast&&fast->next) { slow=slow->next; fast=fast->next->next;
    if(slow==fast) { slow=a; while(slow!=fast) { slow=slow->next; fast=fast->next; } return slow; }
}
return nullptr;`,
21:s`return bgMerge(a,b);`,
2:s`ListNode dummy; auto tail=&dummy; int carry=0;
while(a||b||carry) { int total=carry;
    if(a) { total+=a->val; a=a->next; } if(b) { total+=b->val; b=b->next; }
    tail->next=new ListNode(total%10); tail=tail->next; carry=total/10;
}
return dummy.next;`,
19:s`ListNode dummy(0,a); auto fast=&dummy,slow=&dummy;
for(int i=0;i<b;++i) fast=fast->next;
while(fast->next) { fast=fast->next; slow=slow->next; }
slow->next=slow->next->next; return dummy.next;`,
24:s`ListNode dummy(0,a); auto prev=&dummy;
while(prev->next&&prev->next->next) { auto x=prev->next,y=x->next;
    x->next=y->next; y->next=x; prev->next=y; prev=x;
}
return dummy.next;`,
25:s`ListNode dummy(0,a); auto prev=&dummy;
while(true) {
    auto end=prev; for(int i=0;i<b&&end;++i) end=end->next; if(!end) break;
    auto after=end->next,start=prev->next; end->next=nullptr;
    prev->next=bgReverse(start); start->next=after; prev=start;
}
return dummy.next;`,
138:s`unordered_map<Node*,Node*> copies;
for(auto p=a;p;p=p->next) copies[p]=new Node(p->val);
for(auto p=a;p;p=p->next) { copies[p]->next=copies[p->next]; copies[p]->random=copies[p->random]; }
return copies[a];`,
148:s`function<ListNode*(ListNode*)> mergeSort=[&](ListNode* head)->ListNode* {
    if(!head||!head->next) return head;
    auto slow=head,fast=head->next;
    while(fast&&fast->next) { slow=slow->next; fast=fast->next->next; }
    auto right=slow->next; slow->next=nullptr;
    return bgMerge(mergeSort(head),mergeSort(right));
};
return mergeSort(a);`,
23:s`auto greaterNode=[](ListNode* x,ListNode* y) { return x->val>y->val; };
priority_queue<ListNode*,vector<ListNode*>,decltype(greaterNode)> heap(greaterNode);
for(auto head:a) if(head) heap.push(head);
ListNode dummy; auto tail=&dummy;
while(!heap.empty()) { auto node=heap.top(); heap.pop(); if(node->next) heap.push(node->next); tail->next=node; tail=node; }
return dummy.next;`,
94:s`return bgInorder(a);`,
104:s`function<int(TreeNode*)> depth=[&](TreeNode* node) { return node?1+max(depth(node->left),depth(node->right)):0; };
return depth(a);`,
226:s`function<void(TreeNode*)> flip=[&](TreeNode* node) { if(!node) return; swap(node->left,node->right); flip(node->left); flip(node->right); };
flip(a); return a;`,
101:s`function<bool(TreeNode*,TreeNode*)> equal=[&](TreeNode* x,TreeNode* y) {
    if(!x||!y) return x==y;
    return x->val==y->val&&equal(x->left,y->right)&&equal(x->right,y->left);
};
return !a||equal(a->left,a->right);`,
543:s`int best=0;
function<int(TreeNode*)> depth=[&](TreeNode* node) { if(!node) return 0;
    int l=depth(node->left),r=depth(node->right); best=max(best,l+r); return 1+max(l,r);
};
depth(a); return best;`,
102:s`return bgLevels(a);`,
108:s`function<TreeNode*(int,int)> build=[&](int l,int r)->TreeNode* {
    if(l>=r) return nullptr; int m=l+(r-l)/2;
    return new TreeNode(a[m],build(l,m),build(m+1,r));
};
return build(0,a.size());`,
98:s`function<bool(TreeNode*,long long,long long)> valid=[&](TreeNode* node,long long lo,long long hi) {
    if(!node) return true;
    return node->val>lo&&node->val<hi&&valid(node->left,lo,node->val)&&valid(node->right,node->val,hi);
};
return valid(a,LLONG_MIN,LLONG_MAX);`,
230:s`stack<TreeNode*> st;
while(a||!st.empty()) { while(a) { st.push(a); a=a->left; }
    a=st.top(); st.pop(); if(!--b) return a->val; a=a->right;
}
return 0;`,
199:s`vector<int> out;
for(auto& row:bgLevels(a)) out.push_back(row.back());
return out;`,
114:s`while(a) { if(a->left) { auto tail=a->left; while(tail->right) tail=tail->right;
        tail->right=a->right; a->right=a->left; a->left=nullptr;
    } a=a->right;
}`,
105:s`unordered_map<int,int> pos; for(int i=0;i<(int)b.size();++i) pos[b[i]]=i;
int index=0;
function<TreeNode*(int,int)> build=[&](int l,int r)->TreeNode* {
    if(l>=r) return nullptr; int value=a[index++],m=pos[value]; auto root=new TreeNode(value);
    root->left=build(l,m); root->right=build(m+1,r); return root;
};
return build(0,b.size());`,
437:s`unordered_map<long long,int> count; count[0]=1; int answer=0;
function<void(TreeNode*,long long)> dfs=[&](TreeNode* node,long long total) {
    if(!node) return; total+=node->val; answer+=count[total-b]; ++count[total];
    dfs(node->left,total); dfs(node->right,total); --count[total];
};
dfs(a,0); return answer;`,
236:s`function<TreeNode*(TreeNode*)> dfs=[&](TreeNode* node)->TreeNode* {
    if(!node||node==b||node==c) return node;
    auto l=dfs(node->left),r=dfs(node->right); return l&&r?node:l?l:r;
};
return dfs(a);`,
124:s`int best=INT_MIN;
function<int(TreeNode*)> gain=[&](TreeNode* node) { if(!node) return 0;
    int l=max(0,gain(node->left)),r=max(0,gain(node->right)); best=max(best,node->val+l+r);
    return node->val+max(l,r);
};
gain(a); return best;`,
200:s`int m=a.size(),n=a[0].size(),answer=0; int dr[]={1,-1,0,0},dc[]={0,0,1,-1};
for(int r=0;r<m;++r) for(int c=0;c<n;++c) if(a[r][c]=='1') {
    ++answer; queue<pair<int,int>> q; q.push({r,c}); a[r][c]='0';
    while(!q.empty()) { pair<int,int> cell=q.front(); q.pop(); int x=cell.first,y=cell.second;
        for(int d=0;d<4;++d) { int i=x+dr[d],j=y+dc[d];
            if(i>=0&&j>=0&&i<m&&j<n&&a[i][j]=='1') { a[i][j]='0'; q.push({i,j}); }
        }
    }
}
return answer;`,
994:s`int m=a.size(),n=a[0].size(),fresh=0,minutes=0; queue<tuple<int,int,int>> q;
for(int r=0;r<m;++r) for(int c=0;c<n;++c) { if(a[r][c]==2) q.push({r,c,0}); if(a[r][c]==1) ++fresh; }
int dr[]={1,-1,0,0},dc[]={0,0,1,-1};
while(!q.empty()) { tuple<int,int,int> cell=q.front(); q.pop(); int r=get<0>(cell),c=get<1>(cell),t=get<2>(cell); minutes=t;
    for(int d=0;d<4;++d) { int x=r+dr[d],y=c+dc[d]; if(x>=0&&y>=0&&x<m&&y<n&&a[x][y]==1) {
        a[x][y]=2; --fresh; q.push({x,y,t+1});
    } }
}
return fresh?-1:minutes;`,
207:s`return (int)bgTopo(a,b).size()==a;`,
46:s`vector<vector<int>> out;
function<void(int)> dfs=[&](int i) { if(i==(int)a.size()) { out.push_back(a); return; }
    for(int j=i;j<(int)a.size();++j) { swap(a[i],a[j]); dfs(i+1); swap(a[i],a[j]); }
};
dfs(0); return out;`,
78:s`vector<vector<int>> out(1);
for(int x:a) { int n=out.size(); for(int i=0;i<n;++i) { auto row=out[i]; row.push_back(x); out.push_back(row); } }
return out;`,
17:s`if(a.empty()) return {};
vector<string> letters={"","","abc","def","ghi","jkl","mno","pqrs","tuv","wxyz"},out={""};
for(char digit:a) { vector<string> next;
    for(auto& prefix:out) for(char ch:letters[digit-'0']) next.push_back(prefix+ch);
    out=move(next);
}
return out;`,
39:s`sort(a.begin(),a.end()); vector<vector<int>> out; vector<int> path;
function<void(int,int)> dfs=[&](int start,int remaining) { if(!remaining) { out.push_back(path); return; }
    for(int i=start;i<(int)a.size()&&a[i]<=remaining;++i) { path.push_back(a[i]); dfs(i,remaining-a[i]); path.pop_back(); }
};
dfs(0,b); return out;`,
22:s`vector<string> out;
function<void(string,int,int)> dfs=[&](string path,int l,int r) {
    if(l==a&&r==a) { out.push_back(path); return; }
    if(l<a) dfs(path+'(',l+1,r); if(r<l) dfs(path+')',l,r+1);
};
dfs("",0,0); return out;`,
79:s`return bgExists(a,b);`,
131:s`int n=a.size(); vector<vector<bool>> palindrome(n,vector<bool>(n));
for(int i=n-1;i>=0;--i) for(int j=i;j<n;++j) palindrome[i][j]=a[i]==a[j]&&(j-i<2||palindrome[i+1][j-1]);
vector<vector<string>> out; vector<string> path;
function<void(int)> dfs=[&](int i) { if(i==n) { out.push_back(path); return; }
    for(int j=i;j<n;++j) if(palindrome[i][j]) { path.push_back(a.substr(i,j-i+1)); dfs(j+1); path.pop_back(); }
};
dfs(0); return out;`,
51:s`return bgQueens(a);`,
35:s`return lower_bound(a.begin(),a.end(),b)-a.begin();`,
74:s`int n=a[0].size(),l=0,r=(int)a.size()*n-1;
while(l<=r) { int m=l+(r-l)/2,value=a[m/n][m%n]; if(value==b) return true; if(value<b) l=m+1; else r=m-1; }
return false;`,
34:s`int l=lower_bound(a.begin(),a.end(),b)-a.begin(),r=upper_bound(a.begin(),a.end(),b)-a.begin()-1;
return l<=r?vector<int>{l,r}:vector<int>{-1,-1};`,
33:s`int l=0,r=(int)a.size()-1;
while(l<=r) { int m=l+(r-l)/2; if(a[m]==b) return m;
    if(a[l]<=a[m]) { if(a[l]<=b&&b<a[m]) r=m-1; else l=m+1; }
    else { if(a[m]<b&&b<=a[r]) l=m+1; else r=m-1; }
}
return -1;`,
153:s`int l=0,r=(int)a.size()-1;
while(l<r) { int m=l+(r-l)/2; if(a[m]>a[r]) l=m+1; else r=m; }
return a[l];`,
4:s`auto *shorter=&a,*longer=&b; if(a.size()>b.size()) swap(shorter,longer);
int m=shorter->size(),n=longer->size(),l=0,r=m;
while(l<=r) { int i=l+(r-l)/2,j=(m+n+1)/2-i;
    int al=i?(*shorter)[i-1]:INT_MIN,ar=i<m?(*shorter)[i]:INT_MAX;
    int bl=j?(*longer)[j-1]:INT_MIN,br=j<n?(*longer)[j]:INT_MAX;
    if(al<=br&&bl<=ar) return (m+n)%2?max(al,bl):((double)max(al,bl)+min(ar,br))/2;
    if(al>br) r=i-1; else l=i+1;
}
return 0;`,
20:s`stack<char> st;
for(char ch:a) { if(ch=='('||ch=='['||ch=='{') st.push(ch);
    else { if(st.empty()) return false; char want=ch==')'?'(':ch==']'?'[':'{'; if(st.top()!=want) return false; st.pop(); }
}
return st.empty();`,
394:s`size_t i=0;
function<string()> parse=[&]() { string out;
    while(i<a.size()&&a[i]!=']') { if(isdigit((unsigned char)a[i])) {
        int count=0; while(i<a.size()&&isdigit((unsigned char)a[i])) count=count*10+a[i++]-'0';
        ++i; string inner=parse(); ++i; while(count--) out+=inner;
    } else out+=a[i++]; }
    return out;
};
return parse();`,
739:s`vector<int> out(a.size()),st;
for(int i=0;i<(int)a.size();++i) { while(!st.empty()&&a[i]>a[st.back()]) { int j=st.back(); st.pop_back(); out[j]=i-j; } st.push_back(i); }
return out;`,
84:s`vector<int> st={-1}; int best=0;
for(int i=0;i<=(int)a.size();++i) { int height=i==(int)a.size()?0:a[i];
    while(st.size()>1&&a[st.back()]>height) { int h=a[st.back()]; st.pop_back(); best=max(best,h*(i-st.back()-1)); }
    st.push_back(i);
}
return best;`,
215:s`nth_element(a.begin(),a.end()-b,a.end()); return a[a.size()-b];`,
347:s`unordered_map<int,int> count; for(int x:a) ++count[x];
priority_queue<pair<int,int>,vector<pair<int,int>>,greater<pair<int,int>>> heap;
for(const pair<const int,int>& entry:count) { int value=entry.first,freq=entry.second; heap.push({freq,value}); if((int)heap.size()>b) heap.pop(); }
vector<int> out; while(!heap.empty()) { out.push_back(heap.top().second); heap.pop(); } return out;`,
121:s`int low=INT_MAX,best=0;
for(int price:a) { low=min(low,price); best=max(best,price-low); } return best;`,
55:s`int reach=0;
for(int i=0;i<(int)a.size();++i) { if(i>reach) return false; reach=max(reach,i+a[i]); } return true;`,
45:s`int reach=0,end=0,steps=0;
for(int i=0;i+1<(int)a.size();++i) { reach=max(reach,i+a[i]); if(i==end) { ++steps; end=reach; } } return steps;`,
763:s`vector<int> last(256),out;
for(int i=0;i<(int)a.size();++i) last[(unsigned char)a[i]]=i;
int start=0,end=0;
for(int i=0;i<(int)a.size();++i) { end=max(end,last[(unsigned char)a[i]]); if(i==end) { out.push_back(end-start+1); start=i+1; } } return out;`,
70:s`int prev=1,current=1;
for(int i=1;i<a;++i) { int next=prev+current; prev=current; current=next; } return current;`,
118:s`vector<vector<int>> out;
for(int i=0;i<a;++i) { vector<int> row(i+1,1); for(int j=1;j<i;++j) row[j]=out.back()[j-1]+out.back()[j]; out.push_back(row); } return out;`,
198:s`int take=0,skip=0;
for(int value:a) { int next=skip+value; skip=max(take,skip); take=next; } return max(take,skip);`,
279:s`vector<int> dp(a+1,a); dp[0]=0;
for(int i=1;i<=a;++i) for(int j=1;j*j<=i;++j) dp[i]=min(dp[i],dp[i-j*j]+1); return dp[a];`,
322:s`vector<int> dp(b+1,b+1); dp[0]=0;
for(int amount=1;amount<=b;++amount) for(int coin:a) if(coin<=amount) dp[amount]=min(dp[amount],dp[amount-coin]+1);
return dp[b]>b?-1:dp[b];`,
139:s`unordered_set<string> words(b.begin(),b.end()); vector<bool> dp(a.size()+1); dp[0]=true;
for(int i=1;i<=(int)a.size();++i) for(int j=0;j<i;++j) if(dp[j]&&words.count(a.substr(j,i-j))) { dp[i]=true; break; } return dp.back();`,
300:s`vector<int> tails;
for(int value:a) { auto it=lower_bound(tails.begin(),tails.end(),value); if(it==tails.end()) tails.push_back(value); else *it=value; } return tails.size();`,
152:s`int hi=a[0],lo=a[0],best=a[0];
for(int i=1;i<(int)a.size();++i) { int x=a[i],nextHi=max({x,hi*x,lo*x}),nextLo=min({x,hi*x,lo*x}); hi=nextHi; lo=nextLo; best=max(best,hi); } return best;`,
416:s`int total=accumulate(a.begin(),a.end(),0); if(total%2) return false;
int target=total/2; vector<bool> dp(target+1); dp[0]=true;
for(int value:a) for(int j=target;j>=value;--j) dp[j]=dp[j]||dp[j-value]; return dp[target];`,
32:s`vector<int> st={-1}; int best=0;
for(int i=0;i<(int)a.size();++i) if(a[i]=='(') st.push_back(i);
else { st.pop_back(); if(st.empty()) st.push_back(i); else best=max(best,i-st.back()); } return best;`,
62:s`vector<int> dp(b,1);
for(int r=1;r<a;++r) for(int c=1;c<b;++c) dp[c]+=dp[c-1]; return dp.back();`,
64:s`vector<int> dp(a[0].size(),INT_MAX/2); dp[0]=0;
for(auto& row:a) for(int c=0;c<(int)row.size();++c) dp[c]=row[c]+min(dp[c],c?dp[c-1]:INT_MAX/2); return dp.back();`,
5:s`int start=0,length=0;
for(int i=0;i<(int)a.size();++i) for(int offset=0;offset<2;++offset) { int l=i,r=i+offset;
    while(l>=0&&r<(int)a.size()&&a[l]==a[r]) { if(r-l+1>length) { start=l; length=r-l+1; } --l; ++r; }
} return a.substr(start,length);`,
1143:s`vector<int> dp(b.size()+1);
for(char ch:a) { int diag=0; for(int j=1;j<=(int)b.size();++j) { int old=dp[j]; dp[j]=ch==b[j-1]?diag+1:max(dp[j],dp[j-1]); diag=old; } } return dp.back();`,
72:s`vector<int> dp(b.size()+1); iota(dp.begin(),dp.end(),0);
for(int i=1;i<=(int)a.size();++i) { int diag=dp[0]; dp[0]=i;
    for(int j=1;j<=(int)b.size();++j) { int old=dp[j]; dp[j]=a[i-1]==b[j-1]?diag:1+min({diag,dp[j],dp[j-1]}); diag=old; }
} return dp.back();`,
136:s`int value=0; for(int x:a) value^=x; return value;`,
169:s`int candidate=0,count=0;
for(int x:a) { if(!count) candidate=x; count+=x==candidate?1:-1; } return candidate;`,
75:s`int left=0,i=0,right=(int)a.size()-1;
while(i<=right) { if(a[i]==0) swap(a[left++],a[i++]); else if(a[i]==2) swap(a[i],a[right--]); else ++i; }`,
31:s`int i=(int)a.size()-2;
while(i>=0&&a[i]>=a[i+1]) --i;
if(i>=0) { int j=a.size()-1; while(a[j]<=a[i]) --j; swap(a[i],a[j]); }
reverse(a.begin()+i+1,a.end());`,
287:s`int slow=a[0],fast=a[a[0]];
while(slow!=fast) { slow=a[slow]; fast=a[a[fast]]; }
slow=0; while(slow!=fast) { slow=a[slow]; fast=a[fast]; } return slow;`,
88:s`int i=b-1,j=d-1,write=b+d-1;
while(j>=0) { if(i>=0&&a[i]>c[j]) a[write--]=a[i--]; else a[write--]=c[j--]; }`,
27:s`int write=0; for(int x:a) if(x!=b) a[write++]=x; return write;`,
26:s`int write=0; for(int x:a) if(write==0||x!=a[write-1]) a[write++]=x; return write;`,
80:s`int write=0; for(int x:a) if(write<2||x!=a[write-2]) a[write++]=x; return write;`,
122:s`int answer=0; for(int i=1;i<(int)a.size();++i) answer+=max(0,a[i]-a[i-1]); return answer;`,
274:s`sort(a.begin(),a.end(),greater<int>()); int h=0;
while(h<(int)a.size()&&a[h]>=h+1) ++h; return h;`,
134:s`int total=0,tank=0,start=0;
for(int i=0;i<(int)a.size();++i) { total+=a[i]-b[i]; tank+=a[i]-b[i]; if(tank<0) { tank=0; start=i+1; } } return total<0?-1:start;`,
135:s`vector<int> sweets(a.size(),1);
for(int i=1;i<(int)a.size();++i) if(a[i]>a[i-1]) sweets[i]=sweets[i-1]+1;
for(int i=(int)a.size()-2;i>=0;--i) if(a[i]>a[i+1]) sweets[i]=max(sweets[i],sweets[i+1]+1);
return accumulate(sweets.begin(),sweets.end(),0);`,
13:s`unordered_map<char,int> value={{'I',1},{'V',5},{'X',10},{'L',50},{'C',100},{'D',500},{'M',1000}};
int answer=0;
for(int i=0;i<(int)a.size();++i) answer+=(i+1<(int)a.size()&&value[a[i]]<value[a[i+1]])?-value[a[i]]:value[a[i]];
return answer;`,
12:s`vector<pair<int,string>> symbols={{1000,"M"},{900,"CM"},{500,"D"},{400,"CD"},{100,"C"},{90,"XC"},{50,"L"},{40,"XL"},{10,"X"},{9,"IX"},{5,"V"},{4,"IV"},{1,"I"}};
string out; for(const pair<int,string>& item:symbols) { int value=item.first; const string& symbol=item.second; while(a>=value) { a-=value; out+=symbol; } } return out;`,
58:s`int i=(int)a.size()-1,length=0; while(i>=0&&a[i]==' ') --i;
while(i>=0&&a[i]!=' ') { --i; ++length; } return length;`,
14:s`string prefix=a[0];
for(auto& word:a) while(word.compare(0,prefix.size(),prefix)!=0) prefix.pop_back(); return prefix;`,
151:s`istringstream input(a); vector<string> words; string word,out;
while(input>>word) words.push_back(word);
for(int i=(int)words.size()-1;i>=0;--i) { if(!out.empty()) out+=' '; out+=words[i]; } return out;`,
6:s`if(b==1) return a;
vector<string> rows(b); int row=0,direction=1;
for(char ch:a) { rows[row]+=ch; if(row==0) direction=1; if(row==b-1) direction=-1; row+=direction; }
string out; for(auto& line:rows) out+=line; return out;`,
28:s`// KMP前缀函数，失配时复用已经匹配的前后缀。
vector<int> prefix(b.size());
for(int i=1,j=0;i<(int)b.size();++i) { while(j&&b[i]!=b[j]) j=prefix[j-1]; if(b[i]==b[j]) ++j; prefix[i]=j; }
for(int i=0,j=0;i<(int)a.size();++i) { while(j&&a[i]!=b[j]) j=prefix[j-1]; if(a[i]==b[j]) ++j; if(j==(int)b.size()) return i-j+1; } return -1;`,
68:s`vector<string> out; int i=0;
while(i<(int)a.size()) { int j=i,chars=0;
    while(j<(int)a.size()&&chars+(int)a[j].size()+j-i<=b) chars+=a[j++].size();
    int count=j-i; string line;
    if(j==(int)a.size()||count==1) { for(int k=i;k<j;++k) { if(k>i) line+=' '; line+=a[k]; } line+=string(b-line.size(),' '); }
    else { int spaces=b-chars,base=spaces/(count-1),extra=spaces%(count-1);
        for(int k=i;k<j;++k) { line+=a[k]; if(k+1<j) line+=string(base+(k-i<extra),' '); }
    } out.push_back(line); i=j;
} return out;`,
125:s`int l=0,r=(int)a.size()-1;
while(l<r) { while(l<r&&!isalnum((unsigned char)a[l])) ++l; while(l<r&&!isalnum((unsigned char)a[r])) --r;
    if(tolower((unsigned char)a[l++])!=tolower((unsigned char)a[r--])) return false;
} return true;`,
392:s`size_t i=0; for(char ch:b) if(i<a.size()&&a[i]==ch) ++i; return i==a.size();`,
167:s`int l=0,r=(int)a.size()-1;
while(l<r) { int total=a[l]+a[r]; if(total==b) return {l+1,r+1}; if(total<b) ++l; else --r; } return {};`,
209:s`int left=0,total=0,best=INT_MAX;
for(int right=0;right<(int)b.size();++right) { total+=b[right]; while(total>=a) { best=min(best,right-left+1); total-=b[left++]; } } return best==INT_MAX?0:best;`,
30:s`int width=b[0].size(),count=b.size(); unordered_map<string,int> need;
for(auto& word:b) ++need[word]; vector<int> out;
for(int offset=0;offset<width;++offset) { int left=offset,used=0; unordered_map<string,int> window;
    for(int right=offset;right+width<=(int)a.size();right+=width) { string word=a.substr(right,width);
        if(!need.count(word)) { window.clear(); used=0; left=right+width; continue; }
        ++window[word]; ++used;
        while(window[word]>need[word]) { --window[a.substr(left,width)]; left+=width; --used; }
        if(used==count) out.push_back(left);
    }
} return out;`,
36:s`bool rows[9][9]={},cols[9][9]={},boxes[9][9]={};
for(int r=0;r<9;++r) for(int c=0;c<9;++c) if(a[r][c]!='.') { int value=a[r][c]-'1',box=(r/3)*3+c/3;
    if(rows[r][value]||cols[c][value]||boxes[box][value]) return false;
    rows[r][value]=cols[c][value]=boxes[box][value]=true;
} return true;`,
289:s`int m=a.size(),n=a[0].size(); auto next=a;
for(int r=0;r<m;++r) for(int c=0;c<n;++c) { int neighbors=0;
    for(int dr=-1;dr<=1;++dr) for(int dc=-1;dc<=1;++dc) if((dr||dc)&&r+dr>=0&&c+dc>=0&&r+dr<m&&c+dc<n) neighbors+=a[r+dr][c+dc];
    next[r][c]=neighbors==3||(a[r][c]&&neighbors==2);
} a=move(next);`,
383:s`int count[26]={}; for(char ch:b) ++count[ch-'a'];
for(char ch:a) if(--count[ch-'a']<0) return false; return true;`,
205:s`vector<int> forward(256,-1),backward(256,-1);
for(int i=0;i<(int)a.size();++i) { unsigned char x=a[i],y=b[i];
    if((forward[x]!=-1&&forward[x]!=y)||(backward[y]!=-1&&backward[y]!=x)) return false;
    forward[x]=y; backward[y]=x;
} return true;`,
290:s`istringstream input(b); vector<string> words; string word;
while(input>>word) words.push_back(word); if(words.size()!=a.size()) return false;
unordered_map<char,string> forward; unordered_map<string,char> backward;
for(int i=0;i<(int)a.size();++i) {
    if((forward.count(a[i])&&forward[a[i]]!=words[i])||(backward.count(words[i])&&backward[words[i]]!=a[i])) return false;
    forward[a[i]]=words[i]; backward[words[i]]=a[i];
} return true;`,
242:s`if(a.size()!=b.size()) return false;
int count[26]={}; for(char ch:a) ++count[ch-'a']; for(char ch:b) if(--count[ch-'a']<0) return false; return true;`,
202:s`unordered_set<int> seen;
while(a!=1&&seen.insert(a).second) { int total=0; while(a) { int digit=a%10; total+=digit*digit; a/=10; } a=total; } return a==1;`,
219:s`unordered_map<int,int> last;
for(int i=0;i<(int)a.size();++i) { if(last.count(a[i])&&i-last[a[i]]<=b) return true; last[a[i]]=i; } return false;`,
228:s`vector<string> out;
for(int i=0;i<(int)a.size();++i) { int j=i; while(j+1<(int)a.size()&&(long long)a[j+1]==(long long)a[j]+1) ++j;
    out.push_back(i==j?to_string(a[i]):to_string(a[i])+"->"+to_string(a[j])); i=j;
} return out;`,
57:s`vector<vector<int>> out; int i=0;
while(i<(int)a.size()&&a[i][1]<b[0]) out.push_back(a[i++]);
while(i<(int)a.size()&&a[i][0]<=b[1]) { b[0]=min(b[0],a[i][0]); b[1]=max(b[1],a[i][1]); ++i; }
out.push_back(b); while(i<(int)a.size()) out.push_back(a[i++]); return out;`,
452:s`sort(a.begin(),a.end(),[](const vector<int>& x,const vector<int>& y) { return x[1]<y[1]; });
int arrows=0; long long end=LLONG_MIN;
for(auto& interval:a) if(interval[0]>end) { ++arrows; end=interval[1]; } return arrows;`,
71:s`vector<string> parts; string part; istringstream input(a);
while(getline(input,part,'/')) { if(part=="..") { if(!parts.empty()) parts.pop_back(); }
    else if(!part.empty()&&part!=".") parts.push_back(part);
}
string out; for(auto& name:parts) out+='/'+name; return out.empty()?"/":out;`,
150:s`stack<long long> st;
for(auto& token:a) { if(token=="+"||token=="-"||token=="*"||token=="/") {
    auto right=st.top(); st.pop(); auto left=st.top(); st.pop();
    st.push(token=="+"?left+right:token=="-"?left-right:token=="*"?left*right:left/right);
} else st.push(stoll(token)); } return (int)st.top();`,
224:s`int index=0;
function<long long()> parse=[&]() { long long answer=0; int sign=1;
    while(index<(int)a.size()) { char ch=a[index++];
        if(ch==' ') continue; if(ch=='+') sign=1; else if(ch=='-') sign=-1;
        else if(ch=='(') { answer+=sign*parse(); sign=1; }
        else if(ch==')') return answer;
        else { long long value=ch-'0'; while(index<(int)a.size()&&isdigit((unsigned char)a[index])) value=value*10+a[index++]-'0'; answer+=sign*value; sign=1; }
    } return answer;
}; return (int)parse();`,
92:s`ListNode dummy(0,a); auto prev=&dummy;
for(int i=1;i<b;++i) prev=prev->next;
auto start=prev->next;
for(int i=0;i<c-b;++i) { auto moved=start->next; start->next=moved->next; moved->next=prev->next; prev->next=moved; } return dummy.next;`,
82:s`ListNode dummy(0,a); auto prev=&dummy;
while(a) { if(a->next&&a->val==a->next->val) { int value=a->val; while(a&&a->val==value) a=a->next; prev->next=a; }
    else { prev=a; a=a->next; }
} return dummy.next;`,
61:s`if(!a||!a->next) return a;
int length=1; auto tail=a; while(tail->next) { tail=tail->next; ++length; }
b%=length; if(!b) return a; tail->next=a;
for(int steps=length-b;steps--; ) tail=tail->next;
auto head=tail->next; tail->next=nullptr; return head;`,
86:s`ListNode low,high; auto l=&low,h=&high;
while(a) { if(a->val<b) { l->next=a; l=a; } else { h->next=a; h=a; } a=a->next; }
h->next=nullptr; l->next=high.next; return low.next;`,
100:s`function<bool(TreeNode*,TreeNode*)> same=[&](TreeNode* x,TreeNode* y) { if(!x||!y) return x==y;
    return x->val==y->val&&same(x->left,y->left)&&same(x->right,y->right);
}; return same(a,b);`,
106:s`unordered_map<int,int> pos; for(int i=0;i<(int)a.size();++i) pos[a[i]]=i;
int index=(int)b.size()-1;
function<TreeNode*(int,int)> build=[&](int l,int r)->TreeNode* { if(l>=r) return nullptr;
    int value=b[index--],m=pos[value]; auto root=new TreeNode(value);
    root->right=build(m+1,r); root->left=build(l,m); return root;
}; return build(0,a.size());`,
117:s`if(!a) return nullptr; queue<Node*> q; q.push(a);
while(!q.empty()) { int n=q.size(); Node* prev=nullptr;
    while(n--) { auto node=q.front(); q.pop(); if(prev) prev->next=node; prev=node;
        if(node->left) q.push(node->left); if(node->right) q.push(node->right);
    } prev->next=nullptr;
} return a;`,
112:s`function<bool(TreeNode*,long long)> dfs=[&](TreeNode* node,long long remaining) {
    if(!node) return false; remaining-=node->val;
    if(!node->left&&!node->right) return remaining==0;
    return dfs(node->left,remaining)||dfs(node->right,remaining);
}; return dfs(a,b);`,
129:s`function<int(TreeNode*,int)> dfs=[&](TreeNode* node,int prefix) {
    if(!node) return 0; prefix=prefix*10+node->val;
    if(!node->left&&!node->right) return prefix;
    return dfs(node->left,prefix)+dfs(node->right,prefix);
}; return dfs(a,0);`,
222:s`function<int(TreeNode*)> count=[&](TreeNode* node) { if(!node) return 0;
    int left=0,right=0; for(auto p=node;p;p=p->left) ++left; for(auto p=node;p;p=p->right) ++right;
    if(left==right) return (int)((1LL<<left)-1); return 1+count(node->left)+count(node->right);
}; return count(a);`,
637:s`vector<double> out; for(auto& row:bgLevels(a)) out.push_back(accumulate(row.begin(),row.end(),0.0)/row.size()); return out;`,
103:s`auto out=bgLevels(a); for(int i=1;i<(int)out.size();i+=2) reverse(out[i].begin(),out[i].end()); return out;`,
530:s`auto values=bgInorder(a); long long best=LLONG_MAX;
for(int i=1;i<(int)values.size();++i) best=min(best,(long long)values[i]-values[i-1]); return (int)best;`,
130:s`int m=a.size(),n=a[0].size(); queue<pair<int,int>> q;
for(int r=0;r<m;++r) for(int c=0;c<n;++c) if((r==0||c==0||r==m-1||c==n-1)&&a[r][c]=='O') { a[r][c]='#'; q.push({r,c}); }
int dr[]={1,-1,0,0},dc[]={0,0,1,-1};
while(!q.empty()) { pair<int,int> cell=q.front(); q.pop(); int r=cell.first,c=cell.second; for(int d=0;d<4;++d) { int x=r+dr[d],y=c+dc[d];
    if(x>=0&&y>=0&&x<m&&y<n&&a[x][y]=='O') { a[x][y]='#'; q.push({x,y}); }
} }
for(auto& row:a) for(auto& ch:row) ch=ch=='#'?'O':'X';`,
133:s`unordered_map<Node*,Node*> copies;
function<Node*(Node*)> clone=[&](Node* node)->Node* { if(!node) return nullptr;
    if(copies.count(node)) return copies[node]; auto copy=new Node(node->val); copies[node]=copy;
    for(auto next:node->neighbors) copy->neighbors.push_back(clone(next)); return copy;
}; return clone(a);`,
399:s`unordered_map<string,vector<pair<string,double>>> graph;
for(int i=0;i<(int)a.size();++i) { graph[a[i][0]].push_back({a[i][1],b[i]}); graph[a[i][1]].push_back({a[i][0],1/b[i]}); }
vector<double> out;
for(auto& query:c) { string start=query[0],target=query[1]; double result=-1;
    if(graph.count(start)&&graph.count(target)) { queue<pair<string,double>> q; q.push({start,1}); unordered_set<string> seen={start};
        while(!q.empty()) { pair<string,double> item=q.front(); q.pop(); string node=item.first; double value=item.second; if(node==target) { result=value; break; }
            for(const pair<string,double>& edge:graph[node]) if(seen.insert(edge.first).second) q.push({edge.first,value*edge.second});
        }
    } out.push_back(result);
} return out;`,
210:s`return bgTopo(a,b);`,
909:s`int n=a.size(); queue<pair<int,int>> q; q.push({1,0}); vector<bool> seen(n*n+1); seen[1]=true;
while(!q.empty()) { pair<int,int> item=q.front(); q.pop(); int position=item.first,dist=item.second; if(position==n*n) return dist;
    for(int x=position+1;x<=min(position+6,n*n);++x) { int row=(x-1)/n,col=(x-1)%n;
        int jump=a[n-1-row][row%2?n-1-col:col],next=jump==-1?x:jump;
        if(!seen[next]) { seen[next]=true; q.push({next,dist+1}); }
    }
} return -1;`,
433:s`unordered_set<string> available(c.begin(),c.end()),seen={a}; queue<pair<string,int>> q; q.push({a,0});
while(!q.empty()) { pair<string,int> item=q.front(); q.pop(); string word=item.first; int dist=item.second; if(word==b) return dist;
    for(int i=0;i<(int)word.size();++i) for(char ch:string("ACGT")) { string next=word; next[i]=ch;
        if(available.count(next)&&seen.insert(next).second) q.push({next,dist+1});
    }
} return -1;`,
127:s`unordered_set<string> words(c.begin(),c.end()); if(!words.count(b)) return 0;
queue<pair<string,int>> q; q.push({a,1}); words.erase(a);
while(!q.empty()) { pair<string,int> item=q.front(); q.pop(); string word=item.first; int dist=item.second; if(word==b) return dist;
    for(int i=0;i<(int)word.size();++i) for(char ch='a';ch<='z';++ch) { string next=word; next[i]=ch;
        if(words.erase(next)) q.push({next,dist+1});
    }
} return 0;`,
212:s`// Trie将多个单词的公共前缀合并；退出递归时恢复棋盘。
struct TrieNode { array<int,26> next; int word=-1; TrieNode() { next.fill(-1); } };
vector<TrieNode> trie(1);
for(int i=0;i<(int)b.size();++i) { int p=0; for(char ch:b[i]) { int x=ch-'a';
    if(trie[p].next[x]<0) { trie[p].next[x]=trie.size(); trie.emplace_back(); } p=trie[p].next[x];
} trie[p].word=i; }
vector<string> out; int m=a.size(),n=a[0].size();
function<void(int,int,int)> dfs=[&](int r,int c,int p) { if(r<0||c<0||r>=m||c>=n||a[r][c]=='#') return;
    char old=a[r][c]; int next=trie[p].next[old-'a']; if(next<0) return;
    if(trie[next].word>=0) { out.push_back(b[trie[next].word]); trie[next].word=-1; }
    a[r][c]='#'; dfs(r+1,c,next); dfs(r-1,c,next); dfs(r,c+1,next); dfs(r,c-1,next); a[r][c]=old;
};
for(int r=0;r<m;++r) for(int c=0;c<n;++c) dfs(r,c,0); return out;`,
77:s`vector<vector<int>> out; vector<int> path;
function<void(int)> dfs=[&](int start) { if((int)path.size()==b) { out.push_back(path); return; }
    for(int x=start;x<=a-(b-(int)path.size())+1;++x) { path.push_back(x); dfs(x+1); path.pop_back(); }
}; dfs(1); return out;`,
52:s`int answer=0; vector<bool> col(a),d1(2*a),d2(2*a);
function<void(int)> dfs=[&](int r) { if(r==a) { ++answer; return; }
    for(int c=0;c<a;++c) if(!col[c]&&!d1[r-c+a]&&!d2[r+c]) {
        col[c]=d1[r-c+a]=d2[r+c]=true; dfs(r+1); col[c]=d1[r-c+a]=d2[r+c]=false;
    }
}; dfs(0); return answer;`,
427:s`function<Node*(int,int,int)> build=[&](int r,int c,int size)->Node* {
    bool same=true; for(int i=r;i<r+size;++i) for(int j=c;j<c+size;++j) if(a[i][j]!=a[r][c]) same=false;
    if(same) return new Node(a[r][c]!=0,true); int half=size/2;
    return new Node(false,false,build(r,c,half),build(r,c+half,half),build(r+half,c,half),build(r+half,c+half,half));
}; return build(0,0,a.size());`,
918:s`int total=0,hi=0,lo=0,best=INT_MIN,worst=INT_MAX;
for(int x:a) { hi=max(x,hi+x); lo=min(x,lo+x); best=max(best,hi); worst=min(worst,lo); total+=x; }
return best<0?best:max(best,total-worst);`,
162:s`int l=0,r=(int)a.size()-1;
while(l<r) { int m=l+(r-l)/2; if(a[m]>a[m+1]) r=m; else l=m+1; } return l;`,
502:s`vector<pair<int,int>> projects; for(int i=0;i<(int)c.size();++i) projects.push_back({d[i],c[i]});
sort(projects.begin(),projects.end()); priority_queue<int> available; int i=0;
while(a--) { while(i<(int)projects.size()&&projects[i].first<=b) available.push(projects[i++].second);
    if(available.empty()) break; b+=available.top(); available.pop();
} return b;`,
373:s`vector<vector<int>> out; if(a.empty()||b.empty()) return out;
using Item=tuple<long long,int,int>; priority_queue<Item,vector<Item>,greater<Item>> heap;
for(int i=0;i<min((int)a.size(),c);++i) heap.push({(long long)a[i]+b[0],i,0});
while(c--&&!heap.empty()) { Item item=heap.top(); heap.pop(); int i=get<1>(item),j=get<2>(item); out.push_back({a[i],b[j]});
    if(j+1<(int)b.size()) heap.push({(long long)a[i]+b[j+1],i,j+1});
} return out;`,
67:s`string out; int i=(int)a.size()-1,j=(int)b.size()-1,carry=0;
while(i>=0||j>=0||carry) { int value=carry; if(i>=0) value+=a[i--]-'0'; if(j>=0) value+=b[j--]-'0';
    out+=char('0'+value%2); carry=value/2;
} reverse(out.begin(),out.end()); return out;`,
190:s`uint32_t result=0; for(int i=0;i<32;++i) { result=(result<<1)|(a&1u); a>>=1; } return result;`,
191:s`int count=0; while(a) { a&=a-1; ++count; } return count;`,
137:s`int ones=0,twos=0;
for(int x:a) { ones=(ones^x)&~twos; twos=(twos^x)&~ones; } return ones;`,
201:s`int shift=0; while(a!=b) { a>>=1; b>>=1; ++shift; } return (int)((uint32_t)a<<shift);`,
9:s`if(a<0||(a%10==0&&a!=0)) return false;
int reversed=0; while(a>reversed) { reversed=reversed*10+a%10; a/=10; } return a==reversed||a==reversed/10;`,
66:s`for(int i=(int)a.size()-1;i>=0;--i) { if(a[i]<9) { ++a[i]; return a; } a[i]=0; }
a.insert(a.begin(),1); return a;`,
172:s`int count=0; while(a) { a/=5; count+=a; } return count;`,
69:s`long long l=0,r=(long long)a+1;
while(l+1<r) { long long m=l+(r-l)/2; if(m*m<=a) l=m; else r=m; } return (int)l;`,
50:s`long long exponent=b; if(exponent<0) { a=1/a; exponent=-exponent; }
double result=1;
while(exponent) { if(exponent&1) result*=a; a*=a; exponent>>=1; } return result;`,
149:s`int best=1;
for(int i=0;i<(int)a.size();++i) { map<pair<int,int>,int> count;
    for(int j=i+1;j<(int)a.size();++j) { int dx=a[j][0]-a[i][0],dy=a[j][1]-a[i][1],g=bgGcd(abs(dx),abs(dy));
        dx/=g; dy/=g; if(dx<0||(dx==0&&dy<0)) { dx=-dx; dy=-dy; }
        best=max(best,++count[{dx,dy}]+1);
    }
} return best;`,
120:s`auto dp=a.back();
for(int i=(int)a.size()-2;i>=0;--i) for(int j=0;j<(int)a[i].size();++j) dp[j]=a[i][j]+min(dp[j],dp[j+1]); return dp[0];`,
63:s`vector<int> dp(a[0].size()); dp[0]=1;
for(auto& row:a) for(int c=0;c<(int)row.size();++c) { if(row[c]) dp[c]=0; else if(c) dp[c]+=dp[c-1]; } return dp.back();`,
97:s`if(a.size()+b.size()!=c.size()) return false;
vector<bool> dp(b.size()+1); dp[0]=true;
for(int i=0;i<=(int)a.size();++i) for(int j=0;j<=(int)b.size();++j) if(i||j) {
    dp[j]=(i&&dp[j]&&a[i-1]==c[i+j-1])||(j&&dp[j-1]&&b[j-1]==c[i+j-1]);
} return dp.back();`,
123:s`return bgStock(2,a);`,
188:s`return bgStock(a,b);`,
221:s`vector<int> dp(a[0].size()+1); int best=0;
for(auto& row:a) { int diagonal=0;
    for(int j=1;j<=(int)row.size();++j) { int old=dp[j]; dp[j]=row[j-1]=='1'?1+min({dp[j],dp[j-1],diagonal}):0; diagonal=old; best=max(best,dp[j]); }
} return best*best;`
};
const classes={
146:s`class LRUCache {
    int capacity; list<pair<int,int>> order;
    unordered_map<int,list<pair<int,int>>::iterator> index;
public:
    LRUCache(int capacity):capacity(capacity) {}
    int get(int key) {
        auto it=index.find(key); if(it==index.end()) return -1;
        order.splice(order.begin(),order,it->second); return it->second->second;
    }
    void put(int key,int value) {
        if(index.count(key)) { index[key]->second=value; order.splice(order.begin(),order,index[key]); return; }
        order.push_front({key,value}); index[key]=order.begin();
        if((int)order.size()>capacity) { index.erase(order.back().first); order.pop_back(); }
    }
};`,
155:s`class MinStack {
    vector<pair<int,int>> values;
public:
    MinStack() {}
    void push(int value) { values.push_back({value,values.empty()?value:min(value,values.back().second)}); }
    void pop() { values.pop_back(); }
    int top() { return values.back().first; }
    int getMin() { return values.back().second; }
};`,
208:s`class Trie {
    struct Item { array<int,26> next; bool end=false; Item() { next.fill(-1); } };
    vector<Item> nodes;
    int find(const string& word) { int p=0; for(char ch:word) { p=nodes[p].next[ch-'a']; if(p<0) return -1; } return p; }
public:
    Trie():nodes(1) {}
    void insert(string word) { int p=0; for(char ch:word) { int x=ch-'a'; if(nodes[p].next[x]<0) { nodes[p].next[x]=nodes.size(); nodes.emplace_back(); } p=nodes[p].next[x]; } nodes[p].end=true; }
    bool search(string word) { int p=find(word); return p>=0&&nodes[p].end; }
    bool startsWith(string prefix) { return find(prefix)>=0; }
};`,
295:s`class MedianFinder {
    priority_queue<int> lower;
    priority_queue<int,vector<int>,greater<int>> upper;
public:
    MedianFinder() {}
    void addNum(int num) {
        lower.push(num); upper.push(lower.top()); lower.pop();
        if(upper.size()>lower.size()) { lower.push(upper.top()); upper.pop(); }
    }
    double findMedian() { return lower.size()>upper.size()?lower.top():((double)lower.top()+upper.top())/2; }
};`,
380:s`class RandomizedSet {
    vector<int> values; unordered_map<int,int> index; mt19937 rng{random_device{}()};
public:
    RandomizedSet() {}
    bool insert(int val) { if(index.count(val)) return false; index[val]=values.size(); values.push_back(val); return true; }
    bool remove(int val) { if(!index.count(val)) return false; int pos=index[val],last=values.back(); values[pos]=last; index[last]=pos; values.pop_back(); index.erase(val); return true; }
    int getRandom() { return values[uniform_int_distribution<int>(0,(int)values.size()-1)(rng)]; }
};`,
173:s`class BSTIterator {
    stack<TreeNode*> pending;
    void pushLeft(TreeNode* node) { while(node) { pending.push(node); node=node->left; } }
public:
    BSTIterator(TreeNode* root) { pushLeft(root); }
    int next() { auto node=pending.top(); pending.pop(); pushLeft(node->right); return node->val; }
    bool hasNext() { return !pending.empty(); }
};`,
211:s`class WordDictionary {
    struct Item { array<int,26> next; bool end=false; Item() { next.fill(-1); } };
    vector<Item> nodes;
    bool match(int p,const string& word,int i) {
        if(i==(int)word.size()) return nodes[p].end;
        if(word[i]!='.') { int next=nodes[p].next[word[i]-'a']; return next>=0&&match(next,word,i+1); }
        for(int next:nodes[p].next) if(next>=0&&match(next,word,i+1)) return true; return false;
    }
public:
    WordDictionary():nodes(1) {}
    void addWord(string word) { int p=0; for(char ch:word) { int x=ch-'a'; if(nodes[p].next[x]<0) { nodes[p].next[x]=nodes.size(); nodes.emplace_back(); } p=nodes[p].next[x]; } nodes[p].end=true; }
    bool search(string word) { return match(0,word,0); }
};`
};
const variants={
1:[{title:'排序 + 双指针',idea:'将值和原下标绑定后排序，用左右指针寻找目标和。时间 O(n log n)，额外空间 O(n)。',body:s`vector<pair<int,int>> values;
for(int i=0;i<(int)a.size();++i) values.push_back({a[i],i});
sort(values.begin(),values.end()); int l=0,r=(int)values.size()-1;
while(l<r) { long long total=(long long)values[l].first+values[r].first;
    if(total==b) return {values[l].second,values[r].second}; if(total<b) ++l; else --r;
} return {};`}],
3:[{title:'滑动窗口 + 集合',idea:'右端字符重复时持续移除左端字符，再加入新字符。每个字符至多入窗、出窗一次，时间 O(n)。',body:s`unordered_set<char> window; int l=0,best=0;
for(int r=0;r<(int)a.size();++r) { while(window.count(a[r])) window.erase(a[l++]); window.insert(a[r]); best=max(best,r-l+1); }
return best;`}],
42:[{title:'前后缀最高挡板',idea:'分别预计算左侧、右侧最高柱，每格蓄水为两侧挡板较小值减当前高度。时间、空间均 O(n)。',body:s`int n=a.size(); if(!n) return 0;
vector<int> left(n),right(n); left[0]=a[0]; right[n-1]=a[n-1];
for(int i=1;i<n;++i) left[i]=max(left[i-1],a[i]);
for(int i=n-2;i>=0;--i) right[i]=max(right[i+1],a[i]);
int answer=0; for(int i=0;i<n;++i) answer+=min(left[i],right[i])-a[i]; return answer;`}],
53:[{title:'前缀和 + 最小历史前缀',idea:'当前前缀减最小历史前缀得到以当前位置结尾的最佳段和，先查询再更新最小值，避免取空子数组。',body:s`int prefix=0,minimum=0,best=INT_MIN;
for(int x:a) { prefix+=x; best=max(best,prefix-minimum); minimum=min(minimum,prefix); } return best;`}],
215:[{title:'大小为 k 的最小堆',idea:'只保留最大的 k 个数，堆顶即第 k 大。时间 O(n log k)，空间 O(k)。',body:s`priority_queue<int,vector<int>,greater<int>> heap;
for(int x:a) { heap.push(x); if((int)heap.size()>b) heap.pop(); } return heap.top();`}],
300:[{title:'O(n²) 动态规划',idea:'dp[i] 是以第 i 项结尾的最长严格递增子序列长度，枚举更早且更小的末尾进行转移。',body:s`vector<int> dp(a.size(),1); int best=0;
for(int i=0;i<(int)a.size();++i) { for(int j=0;j<i;++j) if(a[j]<a[i]) dp[i]=max(dp[i],dp[j]+1); best=max(best,dp[i]); }
return best;`}],
5:[{title:'区间动态规划',idea:'两端相同且内部为回文，则整个区间为回文。按左端递减填表，时间、空间均 O(n²)。',body:s`int n=a.size(),start=0,length=0; vector<vector<bool>> dp(n,vector<bool>(n));
for(int l=n-1;l>=0;--l) for(int r=l;r<n;++r) if(a[l]==a[r]&&(r-l<2||dp[l+1][r-1])) {
    dp[l][r]=true; if(r-l+1>length) { start=l; length=r-l+1; }
} return a.substr(start,length);`}],
322:[{title:'金额状态图 BFS',idea:'从金额0出发，每加一枚硬币是一条边。首次到目标时的BFS层数就是最少枚数；不可达返回-1。',body:s`vector<bool> seen(b+1); queue<pair<int,int>> q; q.push({0,0}); seen[0]=true;
while(!q.empty()) { pair<int,int> item=q.front(); q.pop(); int value=item.first,count=item.second; if(value==b) return count;
    for(int coin:a) if(coin<=b-value&&!seen[value+coin]) { seen[value+coin]=true; q.push({value+coin,count+1}); }
} return -1;`}],
98:[{title:'中序遍历判断严格递增',idea:'二叉搜索树中序序列必须严格递增。相邻值相等也必须判为非法；时间 O(n)。',body:s`auto values=bgInorder(a);
for(int i=1;i<(int)values.size();++i) if(values[i]<=values[i-1]) return false; return true;`}],
23:[{title:'分治合并链表',idea:'两两合并后使链表数量减半，重复到只剩一条。N个总节点、k条链表，时间 O(N log k)。',body:s`if(a.empty()) return nullptr;
for(int width=1;width<(int)a.size();width*=2) for(int i=0;i+width<(int)a.size();i+=2*width) a[i]=bgMerge(a[i],a[i+width]);
return a[0];`}]
};
const explanations={
23:'用最小堆维护每条非空链表当前的头节点，每次接入最小节点，再将该节点的后继入堆。总节点数N、链表数k，时间 O(N log k)，堆空间 O(k)。',
28:'KMP先为模式串构造前缀函数。匹配失败时直接跳到最长相等前后缀，不回退主串指针。时间 O(n+m)，额外空间 O(m)。',
52:'按行回溯，只维护列与两组对角线的占用状态；完整放置后只增加计数，不生成全部棋盘。',
73:'首行、首列充当标记数组，另用两个布尔值保存它们最初是否含0。先标记内部，再写内部，最后处理首行首列，额外空间 O(1)。',
98:'递归传递每个节点允许的开区间。左子树更新上界，右子树更新下界，使用 long long 的极值避免与 int 节点边界冲突。时间 O(n)，栈空间 O(h)。',
173:'显式栈只保存尚未访问的左链。next弹出节点后压入其右子树的左链，hasNext检查栈是否为空，额外空间 O(h)。',
189:'先对k取模，再反转整个数组、反转前k项、反转剩余项。三次反转完成右轮转，时间 O(n)，额外空间 O(1)。',
212:'将词典建立为Trie，在棋盘回溯时只沿有效前缀继续，找到完整单词后清除终止标记防重。退出递归时还原格子，多个单词共享搜索前缀。',
215:'nth_element按目标次序完成分割，不要求两侧内部排序；目标位置为 n-k。标准库提供平均线性比较次数，另一解法展示大小k的最小堆。',
222:'比较最左路径和最右路径高度；相同时当前完全子树是满二叉树，节点数可直接计算，否则递归左右子树。时间 O(log² n)。',
242:'先比较长度，再使用26维计数数组先累加后扣减；发现不足立即失败。时间 O(n)，额外空间 O(26)。',
283:'写指针按原次序收集非零元素，之后将尾部全部填0，保持非零元素的相对次序。时间 O(n)，额外空间 O(1)。',
295:'较小一半存大根堆，较大一半存小根堆。每次插入后维持两堆大小差至多1，较小半不小于较大半的元素数量，堆顶直接给出中位数。插入 O(log n)，查询 O(1)。'
};
module.exports={helpers,bodies,classes,variants,explanations};
